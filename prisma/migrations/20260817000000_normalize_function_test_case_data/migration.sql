-- Normalize flattened function test case data into the new wire format.
--
-- The flatten migration (20260708021600) copied the legacy
-- FunctionOutputTestCase columns into ProblemTestCase.data as
-- {function_name, parameters, comparisons, return_type}. This migration
-- rewrites that shape into the schema the function test case system reads:
--
--   {
--     "function":     <function key>,
--     "parameters":   [{ "name": "", "value": { "type", "options", "data" } }],
--     "comparisons":  [{ "symbol", "operator": { "type", "options" }, "value": {...} }]
--   }
--
-- It also synthesizes the missing function definitions into each problem's
-- extension_data so the transformed rows link up, normalizes rows written by
-- the new system before its schema stabilized (camelCase operator ids,
-- string-typed int options) and renames the flattened row type from
-- 'function_output' to 'function'.

CREATE OR REPLACE FUNCTION pg_temp.transform_data(p jsonb) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  t text := p->>'type';
  d jsonb := COALESCE(p->'data', '{}'::jsonb);
BEGIN
  IF t = 'pointer' THEN
    RETURN pg_temp.transform_data(d->'target');
  ELSIF t = 'void' THEN
    RETURN '{}'::jsonb;
  ELSE
    RETURN jsonb_build_object('value', d->>'value');
  END IF;
END
$$;

-- Convert a legacy type value `{type, data}` into `{type, options, data}`.
CREATE OR REPLACE FUNCTION pg_temp.transform_type_value(p jsonb) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  t text := p->>'type';
  d jsonb := COALESCE(p->'data', '{}'::jsonb);

BEGIN
  IF t = 'int' THEN
    RETURN jsonb_build_object(
      'type', 'int',
      'options', jsonb_build_object(
        'size', (d->>'size')::int,
        'signed', CASE d->>'signed' WHEN 'signed' THEN true WHEN 'unsigned' THEN false ELSE NULL END
      ),
      'data', jsonb_build_object('value', d->>'value')
    );
  ELSIF t = 'float' THEN
    RETURN jsonb_build_object(
      'type', 'float',
      'options', jsonb_build_object('size', (d->>'size')::int),
      'data', jsonb_build_object('value', d->>'value')
    );
  ELSIF t = 'string' THEN
    RETURN jsonb_build_object(
      'type', 'string',
      'options', '{}'::jsonb,
      'data', jsonb_build_object('value', d->>'value')
    );
  ELSIF t = 'pointer' THEN
    RETURN jsonb_build_object(
      'type', 'pointer',
      'options', jsonb_build_object(
        'target', pg_temp.transform_type_value(d->'target') - 'data'
      ),
      'data', pg_temp.transform_data(d->'target')
    );
  ELSIF t = 'void' THEN
    RETURN jsonb_build_object('type', 'void', 'options', '{}'::jsonb, 'data', '{}'::jsonb);
  ELSE
    RETURN p;
  END IF;
END
$$;

-- Normalize a new-format type value `{type, options, data}`: integer sizes
-- become numbers and signed flags become real booleans.
CREATE OR REPLACE FUNCTION pg_temp.normalize_type_value(v jsonb) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  t text := v->>'type';
  o jsonb := COALESCE(v->'options', '{}'::jsonb);
BEGIN
  IF t = 'int' THEN
    RETURN jsonb_build_object(
      'type', 'int',
      'options', jsonb_build_object(
        'size', (o->>'size')::int,
        'signed', CASE o->>'signed' WHEN 'true' THEN true WHEN 'false' THEN false ELSE NULL END
      ),
      'data', COALESCE(v->'data', '{}'::jsonb)
    );
  ELSIF t = 'float' THEN
    RETURN jsonb_build_object(
      'type', 'float',
      'options', jsonb_build_object('size', (o->>'size')::int),
      'data', COALESCE(v->'data', '{}'::jsonb)
    );
  ELSE
    RETURN v;
  END IF;
END
$$;

-- Assign a stable uuid key per legacy function so the synthesized
-- definitions and the transformed test cases reference the same key.
CREATE TEMP TABLE pg_temp.legacy_function_keys AS
SELECT l."problem_id", l.fn_name, gen_random_uuid()::text AS fn_key
FROM (
  SELECT DISTINCT "problem_id", "data"->>'function_name' AS fn_name
  FROM "ProblemTestCase"
  WHERE "data" ? 'function_name'
) l;

-- Synthesize the missing function definitions into each problem's
-- extension_data, keyed by uuid, so the transformed test cases resolve
-- their function definitions. Existing definitions are kept.
WITH definitions AS (
  SELECT
    k."problem_id",
    jsonb_object_agg(
      k.fn_key,
      jsonb_build_object(
        'name', k.fn_name,
        'parameters', (
          SELECT COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'name', '',
                'type', pg_temp.transform_type_value(elem) - 'data'
              )
            ),
            '[]'::jsonb
          )
          FROM jsonb_array_elements(l."data"->'parameters') AS elem
        ),
        'returnType', jsonb_build_array(
          pg_temp.transform_type_value(l."data"->'return_type') - 'data'
        )
      )
    ) AS functions
  FROM pg_temp.legacy_function_keys k
  JOIN LATERAL (
    SELECT "data"
    FROM "ProblemTestCase" ptc
    WHERE ptc."problem_id" = k."problem_id"
      AND ptc."data"->>'function_name' = k.fn_name
    LIMIT 1
  ) l ON true
  GROUP BY k."problem_id"
)
UPDATE "Problem" pr
SET "extension_data" = jsonb_set(
  COALESCE(pr."extension_data", '{}'::jsonb),
  '{builtin_testCase_function}',
  jsonb_build_object(
    'functions',
    COALESCE(pr."extension_data"->'builtin_testCase_function'->'functions', '{}'::jsonb) || d.functions
  )
)
FROM definitions d
WHERE pr."id" = d."problem_id";

-- Legacy rows flattened by the old migration.
UPDATE "ProblemTestCase" ptc
SET "data" = jsonb_build_object(
  'function', k.fn_key,
  'parameters', (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'name', '',
          'value', pg_temp.normalize_type_value(pg_temp.transform_type_value(elem))
        )
      ),
      '[]'::jsonb
    )
    FROM jsonb_array_elements("data"->'parameters') AS elem
  ),
  'comparisons', (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'symbol', CASE WHEN c->>'symbol' = 'return' THEN 'return' ELSE 'param' || (c->>'symbol') END,
          'operator', jsonb_build_object(
            'type', CASE c->>'operator'
              WHEN 'WITHIN_RANGE' THEN 'within_range'
              WHEN 'LESS_THAN' THEN 'less_than'
              WHEN 'LESS_THAN_EQUAL' THEN 'less_than_equal'
              WHEN 'GREATER_THAN' THEN 'greater_than'
              WHEN 'GREATER_THAN_EQUAL' THEN 'greater_than_equal'
              WHEN 'EQUAL' THEN 'equal'
              WHEN 'NOT_EQUAL' THEN 'not_equal'
              ELSE c->>'operator'
            END,
            'options', CASE WHEN c->>'operator' = 'WITHIN_RANGE'
              THEN jsonb_build_object('range', c->>'range_value')
              ELSE NULL
            END
          ),
          'value', pg_temp.normalize_type_value(pg_temp.transform_type_value(c))
        )
      ),
      '[]'::jsonb
    )
    FROM jsonb_array_elements("data"->'comparisons') AS c
  )
)
FROM pg_temp.legacy_function_keys k
WHERE ptc."data" ? 'function_name'
  AND k."problem_id" = ptc."problem_id"
  AND k.fn_name = ptc."data"->>'function_name';

-- Rows written by the new system before its schema stabilized.
UPDATE "ProblemTestCase"
SET "data" = jsonb_build_object(
  'function', "data"->>'function',
  'parameters', (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'name', COALESCE(p->>'name', ''),
          'value', pg_temp.normalize_type_value(p->'value')
        )
      ),
      '[]'::jsonb
    )
    FROM jsonb_array_elements("data"->'parameters') AS p
  ),
  'comparisons', (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'symbol', c->>'symbol',
          'operator', jsonb_build_object(
            'type', CASE c->'operator'->>'type' WHEN 'lessThan' THEN 'less_than' ELSE c->'operator'->>'type' END,
            'options', c->'operator'->'options'
          ),
          'value', pg_temp.normalize_type_value(c->'value')
        )
      ),
      '[]'::jsonb
    )
    FROM jsonb_array_elements("data"->'comparisons') AS c
  )
)
WHERE "data" ? 'function' AND NOT "data" ? 'function_name';

-- The new test case system registers the function type under 'function'.
UPDATE "ProblemTestCase"
SET "type" = 'function'
WHERE "type" = 'function_output';
