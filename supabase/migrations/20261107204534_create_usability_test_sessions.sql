/*
# Crear registros de pruebas de usabilidad

1. Nueva tabla
- `usability_test_sessions`: almacena una respuesta por participante de la prueba del prototipo.
- `participant_name`: nombre o código del participante.
- `role`: relación del participante con la microempresa.
- `task_results`: resultados de las tareas evaluadas en formato JSON.
- `satisfaction`: calificación general de facilidad de uso entre 1 y 5.
- `comments`: observaciones cualitativas del participante.
- `created_at`: fecha de registro.

2. Seguridad
- Se habilita RLS.
- La prueba académica es un formulario compartido sin inicio de sesión, por lo que anon y authenticated pueden crear y consultar registros.
- Solo se conceden SELECT e INSERT, suficientes para capturar y revisar la evaluación.

3. Notas
- No se modifican ni eliminan productos o movimientos del inventario.
- La tabla permite analizar varias sesiones de prueba sin mezclar sus datos con la operación del inventario.
*/

CREATE TABLE IF NOT EXISTS public.usability_test_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_name text NOT NULL CHECK (char_length(participant_name) BETWEEN 2 AND 80),
  role text NOT NULL CHECK (char_length(role) BETWEEN 2 AND 60),
  task_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  satisfaction integer NOT NULL CHECK (satisfaction BETWEEN 1 AND 5),
  comments text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS usability_test_sessions_created_at_idx ON public.usability_test_sessions(created_at DESC);

ALTER TABLE public.usability_test_sessions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.usability_test_sessions TO anon, authenticated;

DROP POLICY IF EXISTS "shared_select_usability_sessions" ON public.usability_test_sessions;
CREATE POLICY "shared_select_usability_sessions" ON public.usability_test_sessions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_usability_sessions" ON public.usability_test_sessions;
CREATE POLICY "shared_insert_usability_sessions" ON public.usability_test_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);