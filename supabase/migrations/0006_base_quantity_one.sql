-- 0006_base_quantity_one.sql -- simplifies the scaling model per feedback:
-- base_quantity=1 uniformly means "the recipe as written", and starting a
-- guided production is just "how many times to make it" (scale_factor),
-- with no separate batch/cycles concept. Existing recipes were already
-- back-filled to 1 directly; this migration just updates the default and
-- carries the same backfill for reproducibility.

alter table recipes alter column base_quantity set default 1;
update recipes set base_quantity = 1;
