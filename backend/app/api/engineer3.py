"""
Deprecated module.

The endpoints previously prototyped here have been modularized into production-grade enterprise routers:
- app.api.architecture (Architecture Recommendation Engine)
- app.api.sprints (Fibonacci Story Estimation & Capacity-based Sprint Planning)
"""

from app.api.architecture import router as architecture_router  # noqa: F401
from app.api.sprints import router as sprints_router  # noqa: F401
