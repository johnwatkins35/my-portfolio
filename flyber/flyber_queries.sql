-- Flyber local SQL (full dataset in Docker Postgres on port 5433)
-- Container: my-postgres-db
-- Tables: taxi_rides (~1,048,468), view dpm_taxi_rides, dpm_user_research (500)

-- Scope
SELECT COUNT(*) AS n_records FROM taxi_rides;
SELECT MIN(pickup_datetime) AS start_ts, MAX(pickup_datetime) AS end_ts FROM taxi_rides;

SELECT
    MIN(pickup_latitude) AS min_lat, MAX(pickup_latitude) AS max_lat,
    MIN(pickup_longitude) AS min_lon, MAX(pickup_longitude) AS max_lon
FROM taxi_rides;

-- Passenger histogram
SELECT passenger_count, COUNT(*) AS rides
FROM taxi_rides
GROUP BY passenger_count
ORDER BY passenger_count;

-- Temporal
SELECT EXTRACT(HOUR FROM pickup_datetime) AS hour, COUNT(*) AS pickups
FROM taxi_rides
GROUP BY 1
ORDER BY 1;

SELECT TO_CHAR(pickup_datetime, 'Day') AS weekday, COUNT(*) AS pickups
FROM taxi_rides
GROUP BY 1, EXTRACT(DOW FROM pickup_datetime)
ORDER BY EXTRACT(DOW FROM pickup_datetime);

-- User research (matches the later-PDF queries, on real survey data)
SELECT
    q4_income AS income_band,
    ROUND(AVG(q3_age)::numeric, 1) AS average_age,
    COUNT(*) AS respondent_count,
    ROUND(100.0 * AVG(CASE WHEN q8_flying_taxi = 'Y' THEN 1 ELSE 0 END), 1) AS would_use_pct
FROM dpm_user_research
GROUP BY q4_income
ORDER BY respondent_count DESC;

SELECT
    q6_taxis AS uses_taxis,
    q7_rideshare AS uses_rideshare,
    COUNT(*) AS total_users
FROM dpm_user_research
GROUP BY q6_taxis, q7_rideshare
ORDER BY total_users DESC;

SELECT
    COUNT(*) AS total_survey_respondents,
    ROUND(AVG(q3_age)::numeric, 1) AS average_respondent_age,
    ROUND(100.0 * AVG(CASE WHEN q8_flying_taxi = 'Y' THEN 1 ELSE 0 END), 1) AS would_use_pct,
    ROUND(AVG(q9_if_yes)::numeric, 2) AS mean_wtp_per_mile
FROM dpm_user_research;
