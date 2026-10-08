-- Aulas (plan, etapa 8): un alias no se repite dentro de un aula (sin distinguir mayúsculas),
-- porque alias + PIN es lo que identifica al chico al entrar desde otro dispositivo.
create unique index profiles_classroom_alias on private.profiles (classroom_id, lower(alias))
  where classroom_id is not null;

create index classrooms_teacher on private.classrooms (teacher_id);

-- Nombre del aula: corto y no vacío.
alter table private.classrooms
  add constraint classrooms_name_length check (char_length(name) between 1 and 60);
