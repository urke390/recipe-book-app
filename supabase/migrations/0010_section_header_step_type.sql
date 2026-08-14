-- 0010_section_header_step_type.sql -- new step type for a free-text
-- subheading between steps (e.g. "ציפוי:", "לבצק:") - just a title, no
-- ingredient/duration/instructions payload.
alter table recipe_steps drop constraint recipe_steps_type_check;
alter table recipe_steps add constraint recipe_steps_type_check
  check (type in ('ingredient_addition', 'wait_time', 'action', 'parameter_display', 'section_header'));
