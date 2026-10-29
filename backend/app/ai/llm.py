"""
Provider-neutral LLM Adapter for DevPilot AI Generation Pipeline.
Supports Google Gemini, OpenAI, Anthropic, and deterministic Mock/Fake LLM providers.
Includes JSON repair, token usage telemetry, and latency tracking.
"""
import json
import logging
import re
import time
from typing import Any, Type, TypeVar
import httpx
from pydantic import BaseModel

from app.core.config import get_settings

logger = logging.getLogger("devpilot.ai.llm")

T = TypeVar("T", bound=BaseModel)


class LLMError(RuntimeError):
    """Base exception for LLM provider errors."""
    pass


class LLMResponse:
    def __init__(
        self,
        raw_text: str,
        parsed: dict[str, Any] | None = None,
        model: str = "mock",
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
        latency_ms: float = 0.0,
    ):
        self.raw_text = raw_text
        self.parsed = parsed or {}
        self.model = model
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens
        self.total_tokens = prompt_tokens + completion_tokens
        self.latency_ms = latency_ms


def extract_json_from_text(text: str) -> dict[str, Any]:
    """Robustly extract and parse JSON from LLM output, stripping markdown blocks if present."""
    clean_text = text.strip()

    # Strip markdown code blocks ```json ... ```
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", clean_text)
    if match:
        clean_text = match.group(1).strip()

    try:
        return json.loads(clean_text)
    except json.JSONDecodeError:
        # Fallback regex search for outer braces { ... }
        brace_match = re.search(r"(\{[\s\S]*\})", clean_text)
        if brace_match:
            try:
                return json.loads(brace_match.group(1))
            except json.JSONDecodeError:
                pass
        raise LLMError(f"Failed to decode valid JSON from LLM response: {text[:200]}...")


class LLMClient:
    """Provider-neutral LLM client."""

    def __init__(self):
        self.settings = get_settings()

    async def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        response_schema: Type[T] | None = None,
        temperature: float | None = None,
    ) -> tuple[T | dict[str, Any], LLMResponse]:
        """
        Execute completion with requested provider and validate against Pydantic schema.
        """
        provider = self.settings.llm_provider.lower()
        start_time = time.time()

        if provider == "gemini":
            response = await self._call_gemini(system_prompt, user_prompt, temperature)
        elif provider == "openai":
            response = await self._call_openai(system_prompt, user_prompt, temperature)
        elif provider == "anthropic":
            response = await self._call_anthropic(system_prompt, user_prompt, temperature)
        elif provider == "mock":
            response = await self._call_mock(system_prompt, user_prompt, response_schema)
        else:
            # Fallback to mock if unknown provider
            logger.warning("Unknown LLM provider '%s', using mock provider.", provider)
            response = await self._call_mock(system_prompt, user_prompt, response_schema)

        response.latency_ms = round((time.time() - start_time) * 1000, 2)

        # Validate against schema if requested
        if response_schema and response.parsed:
            try:
                validated_obj = response_schema.model_validate(response.parsed)
                return validated_obj, response
            except Exception as exc:
                logger.error("Schema validation error for %s: %s", response_schema.__name__, exc)
                raise LLMError(f"LLM output failed schema validation: {exc}") from exc

        return response.parsed, response

    async def _call_gemini(
        self, system_prompt: str, user_prompt: str, temperature: float | None
    ) -> LLMResponse:
        """Call Google Gemini 1.5 Pro / Flash REST API with JSON mode."""
        api_key = self.settings.llm_api_key or self.settings.embedding_api_key
        if not api_key:
            raise LLMError("DEVPILOT_LLM_API_KEY or DEVPILOT_EMBEDDING_API_KEY must be configured for Gemini.")

        model = self.settings.llm_model or "gemini-1.5-pro"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
        }

        payload = {
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"parts": [{"text": user_prompt}]}],
            "generationConfig": {
                "temperature": temperature or self.settings.llm_temperature,
                "response_mime_type": "application/json",
                "maxOutputTokens": self.settings.llm_max_tokens,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=self.settings.llm_timeout_seconds) as client:
                res = await client.post(url, headers=headers, json=payload)
                if not res.is_success:
                    raise LLMError(f"Gemini API returned HTTP {res.status_code}: {res.text}")
                data = res.json()
        except httpx.HTTPError as exc:
            raise LLMError(f"Gemini API network error: {exc}") from exc

        try:
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
            parsed_json = json.loads(raw_text)
            usage = data.get("usageMetadata", {})
            return LLMResponse(
                raw_text=raw_text,
                parsed=parsed_json,
                model=model,
                prompt_tokens=usage.get("promptTokenCount", 0),
                completion_tokens=usage.get("candidatesTokenCount", 0),
            )
        except (KeyError, IndexError, json.JSONDecodeError) as exc:
            raise LLMError(f"Failed to parse response from Gemini: {exc}") from exc

    async def _call_openai(
        self, system_prompt: str, user_prompt: str, temperature: float | None
    ) -> LLMResponse:
        """Call OpenAI Chat Completions API with response_format json_object."""
        api_key = self.settings.llm_api_key
        if not api_key:
            raise LLMError("DEVPILOT_LLM_API_KEY must be configured for OpenAI.")

        model = self.settings.llm_model or "gpt-4o"
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        }
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "response_format": {"type": "json_object"},
            "temperature": temperature or self.settings.llm_temperature,
            "max_tokens": self.settings.llm_max_tokens,
        }

        try:
            async with httpx.AsyncClient(timeout=self.settings.llm_timeout_seconds) as client:
                res = await client.post(url, headers=headers, json=payload)
                if not res.is_success:
                    raise LLMError(f"OpenAI API returned HTTP {res.status_code}: {res.text}")
                data = res.json()
        except httpx.HTTPError as exc:
            raise LLMError(f"OpenAI API network error: {exc}") from exc

        try:
            raw_text = data["choices"][0]["message"]["content"]
            parsed = json.loads(raw_text)
            usage = data.get("usage", {})
            return LLMResponse(
                raw_text=raw_text,
                parsed=parsed,
                model=model,
                prompt_tokens=usage.get("prompt_tokens", 0),
                completion_tokens=usage.get("completion_tokens", 0),
            )
        except (KeyError, IndexError, json.JSONDecodeError) as exc:
            raise LLMError(f"Failed to parse response from OpenAI: {exc}") from exc

    async def _call_anthropic(
        self, system_prompt: str, user_prompt: str, temperature: float | None
    ) -> LLMResponse:
        """Call Anthropic Claude API."""
        api_key = self.settings.llm_api_key
        if not api_key:
            raise LLMError("DEVPILOT_LLM_API_KEY must be configured for Anthropic.")

        model = self.settings.llm_model or "claude-3-5-sonnet-20241022"
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        }
        payload = {
            "model": model,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}],
            "max_tokens": self.settings.llm_max_tokens,
            "temperature": temperature or self.settings.llm_temperature,
        }

        try:
            async with httpx.AsyncClient(timeout=self.settings.llm_timeout_seconds) as client:
                res = await client.post(url, headers=headers, json=payload)
                if not res.is_success:
                    raise LLMError(f"Anthropic API returned HTTP {res.status_code}: {res.text}")
                data = res.json()
        except httpx.HTTPError as exc:
            raise LLMError(f"Anthropic API network error: {exc}") from exc

        try:
            raw_text = data["content"][0]["text"]
            parsed = extract_json_from_text(raw_text)
            usage = data.get("usage", {})
            return LLMResponse(
                raw_text=raw_text,
                parsed=parsed,
                model=model,
                prompt_tokens=usage.get("input_tokens", 0),
                completion_tokens=usage.get("output_tokens", 0),
            )
        except (KeyError, IndexError, json.JSONDecodeError) as exc:
            raise LLMError(f"Failed to parse response from Anthropic: {exc}") from exc

    async def _call_mock(
        self,
        system_prompt: str,
        user_prompt: str,
        response_schema: Type[T] | None = None,
    ) -> LLMResponse:
        """
        Deterministic Mock Provider.
        Generates schema-compliant, realistic SDLC artifacts based on requirements extracted by Engineer 1.
        Used for fast CI, unit testing, and offline evaluation without external API costs.
        """
        # Extract requirement keys from prompt if present
        req_keys = re.findall(r"(REQ-\d+)", user_prompt)
        if not req_keys:
            req_keys = ["REQ-001"]

        schema_name = response_schema.__name__ if response_schema else ""

        if "UserStories" in schema_name or "stories" in system_prompt.lower():
            stories = []
            for i, key in enumerate(req_keys, 1):
                stories.append({
                    "story_key": f"US-{i:03d}",
                    "title": f"Implement user capability for {key}",
                    "as_a": "Corporate User",
                    "i_want": f"to interact with capability defined in {key}",
                    "so_that": "business workflows can be completed reliably and securely",
                    "invest_evaluation": {
                        "is_independent": True,
                        "is_negotiable": True,
                        "is_valuable": True,
                        "is_estimable": True,
                        "is_small": True,
                        "is_testable": True,
                        "notes": f"Verified against INVEST criteria for {key}",
                    },
                    "estimated_story_points": 3,
                    "priority": "must",
                    "source_requirement_keys": [key],
                    "acceptance_criteria_hints": [
                        f"Ensure {key} validation passes",
                        f"Return appropriate errors when {key} constraints are violated",
                    ],
                })
            parsed = {
                "summary": f"Decomposed {len(stories)} traceable User Stories from source requirements.",
                "stories": stories,
            }

        elif "AcceptanceCriteria" in schema_name or "given-when-then" in system_prompt.lower():
            criteria_list = []
            for i, key in enumerate(req_keys, 1):
                criteria_list.extend([
                    {
                        "criteria_key": f"AC-{i:03d}-1",
                        "story_key": f"US-{i:03d}",
                        "title": f"Successful Execution of {key}",
                        "scenario_type": "happy_path",
                        "given": f"the system is operational and user has valid credentials for {key}",
                        "when": f"the user submits a valid request matching {key}",
                        "then": "the system processes the request successfully and returns HTTP 200/201",
                        "source_requirement_keys": [key],
                    },
                    {
                        "criteria_key": f"AC-{i:03d}-2",
                        "story_key": f"US-{i:03d}",
                        "title": f"Validation Boundary Failure for {key}",
                        "scenario_type": "boundary",
                        "given": f"the user submits input violating boundary limits for {key}",
                        "when": "the submission is validated",
                        "then": "the system rejects the payload with HTTP 422 Unprocessable Entity",
                        "source_requirement_keys": [key],
                    },
                ])
            parsed = {
                "summary": f"Generated {len(criteria_list)} Given-When-Then scenarios covering happy and edge paths.",
                "acceptance_criteria": criteria_list,
            }

        elif "TestCases" in schema_name or "test cases" in system_prompt.lower():
            test_cases = []
            for i, key in enumerate(req_keys, 1):
                test_cases.extend([
                    {
                        "test_key": f"TC-{i:03d}-F",
                        "title": f"Verify Functional Behavior for {key}",
                        "category": "functional",
                        "priority": "high",
                        "preconditions": ["System is online", "Database seeded"],
                        "steps": [
                            f"1. Authenticate as authorized user",
                            f"2. Issue request fulfilling {key}",
                            f"3. Assert response body and status code",
                        ],
                        "expected_result": f"System executes successfully according to {key}",
                        "test_data": {"requirement_key": key, "status": "active"},
                        "source_requirement_keys": [key],
                    },
                    {
                        "test_key": f"TC-{i:03d}-S",
                        "title": f"Verify Security and Authorization for {key}",
                        "category": "security",
                        "priority": "critical",
                        "preconditions": ["No bearer token provided"],
                        "steps": [
                            f"1. Attempt accessing resource for {key} without credentials",
                            f"2. Verify HTTP 401 Unauthorized is returned",
                        ],
                        "expected_result": "Unauthorized requests are blocked with HTTP 401",
                        "test_data": {"auth": "missing"},
                        "source_requirement_keys": [key],
                    },
                ])
            parsed = {
                "summary": f"Generated {len(test_cases)} ISO/IEC 29119 test cases.",
                "test_cases": test_cases,
            }

        elif "OpenApi" in schema_name or "openapi" in system_prompt.lower():
            parsed = {
                "openapi": "3.1.0",
                "info": {
                    "title": "DevPilot Generated Specification",
                    "version": "1.0.0",
                    "description": f"Specification generated from requirements {', '.join(req_keys)}",
                },
                "servers": [{"url": "/api/v1", "description": "Production Server"}],
                "paths": {
                    "/resources": {
                        "get": {
                            "summary": "List resources",
                            "operationId": "listResources",
                            "responses": {
                                "200": {"description": "Resource list successfully retrieved"},
                                "401": {"description": "Unauthorized"},
                            },
                        },
                        "post": {
                            "summary": "Create resource",
                            "operationId": "createResource",
                            "requestBody": {
                                "required": True,
                                "content": {"application/json": {"schema": {"type": "object"}}},
                            },
                            "responses": {
                                "201": {"description": "Resource created"},
                                "422": {"description": "Validation error"},
                            },
                        },
                    }
                },
                "components": {
                    "schemas": {
                        "Resource": {
                            "type": "object",
                            "properties": {
                                "id": {"type": "string", "format": "uuid"},
                                "name": {"type": "string"},
                            },
                        }
                    }
                },
                "x-source-requirement-keys": req_keys,
            }

        elif "Architecture" in schema_name or "architecture" in system_prompt.lower():
            parsed = {
                "pattern": "Modular Monolith",
                "summary": "Enterprise Modular Monolith architecture balancing separation of concerns with operational simplicity.",
                "components": [
                    {
                        "name": "API Gateway",
                        "role": "Edge entry point and TLS termination",
                        "technology": "FastAPI + Traefik",
                        "responsibilities": ["Authentication", "Rate limiting", "Request routing"],
                    },
                    {
                        "name": "Core Application Service",
                        "role": "Modular domain execution engine",
                        "technology": "FastAPI / Python",
                        "responsibilities": ["Business logic execution", "Audit logging", "Transaction validation"],
                    },
                    {
                        "name": "Database Layer",
                        "role": "Relational Persistence & Vector Search",
                        "technology": "PostgreSQL / SQLAlchemy / pgvector",
                        "responsibilities": ["ACID transaction durability", "Relational querying", "Vector similarity retrieval"],
                    },
                ],
                "data_stores": [
                    {
                        "type": "Relational",
                        "technology": "PostgreSQL 16",
                        "rationale": "Primary transactional datastore ensuring ACID consistency across domains.",
                    },
                    {
                        "type": "Cache",
                        "technology": "Redis",
                        "rationale": "In-memory caching of authenticated sessions and rate-limit token buckets.",
                    },
                ],
                "security_patterns": [
                    "Role-Based Access Control (RBAC)",
                    "JWT Bearer Token Authentication",
                    "TLS 1.3 Encryption in Transit",
                    "Database Encryption at Rest (AES-256)",
                ],
                "resilience_patterns": [
                    "Database Connection Pooling",
                    "Circuit Breakers on External APIs",
                    "Graceful Degradation with Cached Reads",
                ],
                "deployment_topology": "Cloud Run serverless container runtime with Cloud SQL PostgreSQL.",
                "alternatives": [
                    {
                        "name": "Microservices",
                        "rationale": "Evaluated for independent service lifecycle autonomy.",
                        "tradeoffs": "Introduces significant distributed coordination overhead and network latency.",
                    }
                ],
                "adrs": [
                    {
                        "id": "ADR-001",
                        "title": "Adopt Modular Monolith Architecture",
                        "context": "Rapid domain evolution and high performance require low operational complexity.",
                        "decision": "Enforce bounded domain modules within a single deployable application container.",
                        "consequences": "Simplifies CI/CD pipelines and testing while preserving future service extraction paths.",
                    }
                ],
                "risks": [
                    "Potential domain coupling if code review boundaries are not strictly preserved.",
                ],
                "assumptions": [
                    "Peak concurrency is within single-cluster Cloud Run autoscaling limits.",
                ],
                "rationale": "A modular monolith provides optimal engineering velocity and zero distributed transaction latency.",
                "evidence": [
                    f"Requirements ({', '.join(req_keys)}) demand strong transactional consistency and rapid iteration.",
                ],
            }

        else:
            parsed = {"status": "success", "source_requirement_keys": req_keys}

        raw_text = json.dumps(parsed, indent=2)
        return LLMResponse(
            raw_text=raw_text,
            parsed=parsed,
            model="devpilot-mock-llm-v1",
            prompt_tokens=len(user_prompt) // 4,
            completion_tokens=len(raw_text) // 4,
        )


default_llm_client = LLMClient()
