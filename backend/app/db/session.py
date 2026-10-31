from __future__ import annotations

from sqlmodel import SQLModel, create_engine

from app.core.config import settings


database_url = settings.sqlalchemy_database_url
connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
engine = create_engine(database_url, connect_args=connect_args, pool_pre_ping=True)


def init_db() -> None:
    from app.db import models  # noqa: F401

    SQLModel.metadata.create_all(engine)

