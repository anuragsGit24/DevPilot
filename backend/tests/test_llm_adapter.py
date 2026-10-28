import pytest
from app.ai.llm import LLMClient, extract_json_from_text
from app.ai.schemas import AcceptanceCriteriaPayload, OpenApiSpecPayload, TestCasesPayload, UserStoriesPayload


@pytest.mark.asyncio
async def test_extract_json_from_markdown():
    """Test JSON extraction handles markdown fences, whitespace, and plain json."""
    markdown_wrapped = """
    Here is the response:
    ```json
    {
      "key": "value",
      "number": 42
    }
    ```
    Thank you!
    """
    data = extract_json_from_text(markdown_wrapped)
    assert data == {"key": "value", "number": 42}


@pytest.mark.asyncio
async def test_llm_client_mock_user_stories():
    """Test LLM client generates structured user stories with INVEST criteria."""
    client = LLMClient()
    prompt = "Requirements: REQ-001 - The system must allow customer login."
    data, meta = await client.generate_structured(
        system_prompt="Generate user stories",
        user_prompt=prompt,
        response_schema=UserStoriesPayload,
    )
    assert isinstance(data, UserStoriesPayload)
    assert len(data.stories) > 0
    story = data.stories[0]
    assert story.story_key.startswith("US-")
    assert story.as_a != ""
    assert story.i_want != ""
    assert story.so_that != ""
    assert story.invest_evaluation.is_testable is True
    assert "REQ-001" in story.source_requirement_keys
    assert meta.model == "devpilot-mock-llm-v1"
    assert meta.latency_ms >= 0


@pytest.mark.asyncio
async def test_llm_client_mock_acceptance_criteria():
    """Test LLM client generates Given-When-Then acceptance criteria."""
    client = LLMClient()
    prompt = "Requirements: REQ-002 - The system must enforce strong passwords."
    data, meta = await client.generate_structured(
        system_prompt="Generate given-when-then criteria",
        user_prompt=prompt,
        response_schema=AcceptanceCriteriaPayload,
    )
    assert isinstance(data, AcceptanceCriteriaPayload)
    assert len(data.acceptance_criteria) >= 2
    happy_path = next((ac for ac in data.acceptance_criteria if ac.scenario_type == "happy_path"), None)
    assert happy_path is not None
    assert happy_path.given != ""
    assert happy_path.when != ""
    assert happy_path.then != ""


@pytest.mark.asyncio
async def test_llm_client_mock_test_cases():
    """Test LLM client generates categorized test cases."""
    client = LLMClient()
    prompt = "Requirements: REQ-003 - Account lockout after 5 failed logins."
    data, meta = await client.generate_structured(
        system_prompt="Generate test cases",
        user_prompt=prompt,
        response_schema=TestCasesPayload,
    )
    assert isinstance(data, TestCasesPayload)
    assert len(data.test_cases) > 0
    sec_test = next((tc for tc in data.test_cases if tc.category == "security"), None)
    assert sec_test is not None
    assert len(sec_test.steps) > 0


@pytest.mark.asyncio
async def test_llm_client_mock_openapi_spec():
    """Test LLM client generates valid OpenAPI 3.1 schema."""
    client = LLMClient()
    prompt = "Requirements: REQ-004 - REST API for transfers."
    data, meta = await client.generate_structured(
        system_prompt="Generate openapi specification",
        user_prompt=prompt,
        response_schema=OpenApiSpecPayload,
    )
    assert isinstance(data, OpenApiSpecPayload)
    assert data.openapi == "3.1.0"
    assert "/resources" in data.paths
