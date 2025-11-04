-- Seed Demo Data for Advisory Status Tracker
-- Run this SQL in Supabase SQL Editor AFTER running migrations 003, 004, 005
-- This script generates realistic demo data for testing and demonstrations

-- Clean up existing demo data (optional - uncomment if you want to reset)
-- DELETE FROM status_updates;
-- DELETE FROM milestones;
-- DELETE FROM actions WHERE program_id IN (SELECT id FROM programs WHERE name LIKE '%Demo%' OR name LIKE '%Modernization%');
-- DELETE FROM risks WHERE program_id IN (SELECT id FROM programs WHERE name LIKE '%Demo%' OR name LIKE '%Modernization%');
-- DELETE FROM workstreams WHERE program_id IN (SELECT id FROM programs WHERE name LIKE '%Demo%' OR name LIKE '%Modernization%');
-- DELETE FROM programs WHERE name LIKE '%Demo%' OR name LIKE '%Modernization%';

-- Create or find demo Program
DO $$
DECLARE
    demo_program_id uuid;
    demo_workstream_ids uuid[];
    week_dates date[];
    i int;
    j int;
    owner_names text[] := ARRAY['Alice Johnson', 'Bob Smith', 'Carol Williams', 'David Brown'];
    rag_values text[] := ARRAY['GREEN', 'GREEN', 'YELLOW', 'RED', 'GREEN'];
    status_texts text[] := ARRAY['On track', 'Slight delay', 'Blocker encountered', 'Critical issue', 'Proceeding well'];
BEGIN
    -- Get or create demo program
    SELECT id INTO demo_program_id
    FROM programs
    WHERE name = 'Regulatory Reporting Modernization (Q4)'
    LIMIT 1;

    IF demo_program_id IS NULL THEN
        INSERT INTO programs (name, sponsor, start_date, end_date)
        VALUES ('Regulatory Reporting Modernization (Q4)', 'EVP, Ops', '2025-10-01', '2025-12-31')
        RETURNING id INTO demo_program_id;
    END IF;

    -- Generate 4 weeks of Monday dates (starting from 4 weeks ago)
    week_dates := ARRAY[
        (CURRENT_DATE - INTERVAL '3 weeks')::date + (1 - EXTRACT(DOW FROM (CURRENT_DATE - INTERVAL '3 weeks'))::int),
        (CURRENT_DATE - INTERVAL '2 weeks')::date + (1 - EXTRACT(DOW FROM (CURRENT_DATE - INTERVAL '2 weeks'))::int),
        (CURRENT_DATE - INTERVAL '1 week')::date + (1 - EXTRACT(DOW FROM (CURRENT_DATE - INTERVAL '1 week'))::int),
        (CURRENT_DATE + (1 - EXTRACT(DOW FROM CURRENT_DATE)::int))::date
    ];

    -- Create 4 Workstreams
    DELETE FROM workstreams WHERE program_id = demo_program_id;
    
    INSERT INTO workstreams (program_id, name, lead, status, percent_complete, summary, description, start_date, end_date, tags, next_milestone, next_milestone_due)
    VALUES
        (demo_program_id, 'Data Ingest Pipeline', owner_names[1], 'YELLOW', 65, 'ETL pipeline for regulatory data. Experienced minor delays due to vendor API changes.', 'Data ingestion and transformation pipeline for regulatory reporting requirements', '2025-10-01', '2025-12-15', '["etl", "api", "data"]'::jsonb, 'Vendor API Integration Complete', CURRENT_DATE + 7),
        (demo_program_id, 'Modeling & Analytics', owner_names[2], 'GREEN', 45, 'Statistical models for compliance reporting. On schedule.', 'Building predictive models and analytics for regulatory compliance', '2025-10-05', '2025-12-20', '["analytics", "ml", "compliance"]'::jsonb, 'Dimension Conformance', CURRENT_DATE + 5),
        (demo_program_id, 'QA & Testing', owner_names[3], 'RED', 30, 'Test data incomplete. Blocking progress on automated test suite.', 'Quality assurance and automated testing framework', '2025-10-10', '2025-12-25', '["qa", "testing", "automation"]'::jsonb, 'Test Data Mock Generation', CURRENT_DATE + 3),
        (demo_program_id, 'Documentation & Training', owner_names[4], 'GREEN', 75, 'User guides and training materials progressing well.', 'Technical documentation and user training materials', '2025-10-15', '2025-12-30', '["docs", "training"]'::jsonb, 'Initial Training Session', CURRENT_DATE + 10);
    
    -- Get the inserted workstream IDs into array (in insertion order)
    SELECT array_agg(id ORDER BY 
        CASE name
            WHEN 'Data Ingest Pipeline' THEN 1
            WHEN 'Modeling & Analytics' THEN 2
            WHEN 'QA & Testing' THEN 3
            WHEN 'Documentation & Training' THEN 4
            ELSE 99
        END
    ) INTO demo_workstream_ids
    FROM workstreams
    WHERE program_id = demo_program_id;

    -- Create 6 Milestones (distributed across workstreams, ±30 days)
    DELETE FROM milestones WHERE workstream_id = ANY(demo_workstream_ids);
    
    INSERT INTO milestones (workstream_id, title, due_date)
    VALUES
        (demo_workstream_ids[1], 'Vendor API Integration Complete', CURRENT_DATE + 7),
        (demo_workstream_ids[1], 'Data Validation Rules Implemented', CURRENT_DATE + 14),
        (demo_workstream_ids[2], 'Dimension Conformance', CURRENT_DATE + 5),
        (demo_workstream_ids[2], 'Model Training Complete', CURRENT_DATE + 20),
        (demo_workstream_ids[3], 'Test Data Mock Generation', CURRENT_DATE + 3),
        (demo_workstream_ids[4], 'Initial Training Session', CURRENT_DATE + 10);

    -- Create 5 Risks (varying severity, at least 2 High and Open)
    DELETE FROM risks WHERE program_id = demo_program_id;
    
    INSERT INTO risks (program_id, workstream_id, title, severity, status, owner, due_date, notes)
    VALUES
        (demo_program_id, demo_workstream_ids[1], 'Vendor API throughput limits', 'HIGH', 'OPEN', owner_names[1], CURRENT_DATE + 10, 'API rate limits may cause delays in data ingestion'),
        (demo_program_id, demo_workstream_ids[3], 'Test data incomplete', 'HIGH', 'OPEN', owner_names[3], CURRENT_DATE + 5, 'Cannot complete automated test suite without proper mock data'),
        (demo_program_id, demo_workstream_ids[2], 'Model performance below threshold', 'MEDIUM', 'OPEN', owner_names[2], CURRENT_DATE + 15, 'Some models not meeting accuracy requirements'),
        (demo_program_id, demo_workstream_ids[1], 'Data quality issues in source', 'MEDIUM', 'MITIGATED', owner_names[1], CURRENT_DATE - 5, 'Resolved by implementing validation layer'),
        (demo_program_id, NULL, 'Resource allocation across teams', 'LOW', 'OPEN', owner_names[1], CURRENT_DATE + 20, 'Balancing workload across development teams');

    -- Create 8 Actions (mix Open/Closed, due dates in next 2 weeks)
    DELETE FROM actions WHERE program_id = demo_program_id;
    
    INSERT INTO actions (program_id, workstream_id, title, owner, due_date, status, notes)
    VALUES
        (demo_program_id, demo_workstream_ids[3], 'Create mock test data', owner_names[3], CURRENT_DATE + 3, 'OPEN', 'Generate synthetic test data for QA automation'),
        (demo_program_id, demo_workstream_ids[1], 'Review vendor API documentation', owner_names[1], CURRENT_DATE + 2, 'IN_PROGRESS', 'Understanding latest API changes'),
        (demo_program_id, demo_workstream_ids[2], 'Tune model hyperparameters', owner_names[2], CURRENT_DATE + 7, 'OPEN', 'Improve model accuracy'),
        (demo_program_id, demo_workstream_ids[4], 'Draft user guide chapter 1', owner_names[4], CURRENT_DATE + 5, 'DONE', 'Completed initial documentation'),
        (demo_program_id, demo_workstream_ids[1], 'Implement rate limiting handler', owner_names[1], CURRENT_DATE + 6, 'OPEN', 'Handle API throttling gracefully'),
        (demo_program_id, demo_workstream_ids[3], 'Set up CI/CD pipeline', owner_names[3], CURRENT_DATE + 10, 'IN_PROGRESS', 'Automated deployment workflow'),
        (demo_program_id, demo_workstream_ids[2], 'Validate model outputs', owner_names[2], CURRENT_DATE + 12, 'OPEN', 'Ensure compliance with regulatory requirements'),
        (demo_program_id, demo_workstream_ids[4], 'Schedule training sessions', owner_names[4], CURRENT_DATE + 8, 'DONE', 'Training calendar finalized');

    -- Create 4 weeks of StatusUpdates per workstream
    DELETE FROM status_updates WHERE workstream_id = ANY(demo_workstream_ids);
    
    FOR i IN 1..array_length(demo_workstream_ids, 1) LOOP
        FOR j IN 1..array_length(week_dates, 1) LOOP
            INSERT INTO status_updates (
                workstream_id,
                week_start,
                rag,
                progress_percent,
                accomplishments,
                blockers,
                plan_next
            ) VALUES (
                demo_workstream_ids[i],
                week_dates[j],
                (CASE WHEN i = 3 AND j >= 2 THEN 'RED' WHEN i = 1 AND j >= 3 THEN 'YELLOW' ELSE rag_values[(j + i) % 5 + 1] END)::status_enum,
                GREATEST(10, LEAST(90, 20 + (j * 15) + (i * 5) - (CASE WHEN i = 3 THEN 10 ELSE 0 END))),
                'Completed ' || (j * 2 + i) || ' tasks. ' || status_texts[(j + i) % 5 + 1] || '. Made significant progress on core features.',
                (CASE WHEN i = 3 AND j >= 2 THEN 'Test data incomplete. Blocking automated test suite.' WHEN i = 1 AND j >= 3 THEN 'Vendor API changes causing integration delays.' ELSE '' END),
                'Next week: Continue with planned milestones. Focus on ' || (CASE WHEN i = 1 THEN 'API integration' WHEN i = 2 THEN 'model training' WHEN i = 3 THEN 'test data' ELSE 'documentation' END) || '.'
            )
            ON CONFLICT (workstream_id, week_start) DO NOTHING;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Demo data created successfully! Program ID: %', demo_program_id;
    RAISE NOTICE 'Workstream IDs: %', demo_workstream_ids;
END $$;

-- Return the program ID for use in .env
SELECT id, name FROM programs WHERE name = 'Regulatory Reporting Modernization (Q4)';
