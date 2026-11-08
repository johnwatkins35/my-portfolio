-- Hotel operations
-- Practical project for the DataCamp SQL Associate certificate, October 2026.
-- PostgreSQL. Tables: branch, request, service.
-- Feedback rows only. Not a production hotel database.

-- Task 1. Clean branch so every column matches the data description.
-- Output name in DataLab: clean_branch_data
SELECT
    id,
    CASE
        WHEN location IN ('EMEA', 'NA', 'LATAM', 'APAC') THEN location
        ELSE 'Unknown'
    END AS location,
    CASE
        WHEN total_rooms BETWEEN 1 AND 400 THEN total_rooms
        ELSE 100
    END AS total_rooms,
    COALESCE(
        staff_count,
        1.5 * CASE
            WHEN total_rooms BETWEEN 1 AND 400 THEN total_rooms
            ELSE 100
        END
    ) AS staff_count,
    CASE
        WHEN opening_date BETWEEN '2000' AND '2023' THEN opening_date
        ELSE '2023'
    END AS opening_date,
    CASE
        WHEN TRIM(target_guests) ILIKE 'B%' THEN 'Business'
        ELSE 'Leisure'
    END AS target_guests
FROM branch;

-- Task 2. Average and maximum request time for each branch and service.
-- Output name in DataLab: average_time_service
SELECT
    service_id,
    branch_id,
    ROUND(AVG(time_taken), 2) AS avg_time_taken,
    ROUND(MAX(time_taken), 2) AS max_time_taken
FROM request
GROUP BY service_id, branch_id;

-- Task 3. Meal and Laundry requests in EMEA and LATAM.
-- Uses the original branch table, not the cleaned output from task 1.
-- Output name in DataLab: target_hotels
SELECT
    s.description,
    b.id AS branch_id,
    b.location,
    r.id AS request_id,
    r.rating
FROM request AS r
JOIN branch AS b ON r.branch_id = b.id
JOIN service AS s ON r.service_id = s.id
WHERE s.description IN ('Meal', 'Laundry')
  AND b.location IN ('EMEA', 'LATAM');

-- Task 4. Branch and service pairs whose average rating is under the 4.5 target.
-- Output name in DataLab: average_rating
SELECT
    service_id,
    branch_id,
    ROUND(AVG(rating), 2) AS avg_rating
FROM request
GROUP BY service_id, branch_id
HAVING ROUND(AVG(rating), 2) < 4.5;
