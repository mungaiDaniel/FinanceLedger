# Ledger API

Flask REST API. Setup, configuration and the endpoint table are in the [root README](../README.md).

```bash
pytest                              # run the suite with coverage
flask --app run db migrate -m "..." # generate a migration after changing models
flask --app run db upgrade          # apply migrations
flask --app run seed-demo           # demo user + sample data
flask --app run create-user NAME EMAIL
```
