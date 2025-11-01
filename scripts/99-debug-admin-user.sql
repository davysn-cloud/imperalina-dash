-- Script de diagnóstico para verificar e corrigir o usuário admin
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se o usuário existe na tabela users
SELECT 'Usuário na tabela users:' as info;
SELECT id, email, name, role, created_at, updated_at 
FROM users 
WHERE email = 'sildavysn@gmail.com';

-- 2. Verificar usuários do Supabase Auth
SELECT 'Usuários no Auth:' as info;
SELECT id, email, created_at, updated_at, email_confirmed_at
FROM auth.users 
WHERE email = 'sildavysn@gmail.com';

-- 3. Forçar criação/atualização do usuário admin
-- Primeiro, deletar se existir com role incorreto
DELETE FROM users WHERE email = 'sildavysn@gmail.com' AND role != 'ADMIN';

-- Inserir ou atualizar para ADMIN
INSERT INTO users (email, name, role, phone) 
VALUES ('sildavysn@gmail.com', 'Sildavysn Admin', 'ADMIN', NULL)
ON CONFLICT (email) 
DO UPDATE SET 
  role = 'ADMIN',
  name = 'Sildavysn Admin',
  updated_at = NOW();

-- 4. Verificar resultado final
SELECT 'Resultado final:' as info;
SELECT id, email, name, role, created_at, updated_at 
FROM users 
WHERE email = 'sildavysn@gmail.com';

-- 5. Verificar se há entrada na tabela professionals (caso seja necessário)
SELECT 'Entrada em professionals:' as info;
SELECT p.id, p.user_id, u.email, u.role, p.allowed_tabs
FROM professionals p
JOIN users u ON p.user_id = u.id
WHERE u.email = 'sildavysn@gmail.com';