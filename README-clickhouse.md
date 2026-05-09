# Delete all past runs and analysis results

docker exec -it clickhouse_db clickhouse-client --user default

USE analytics;
TRUNCATE TABLE prompt_analysis;
TRUNCATE TABLE prompt_responses;
