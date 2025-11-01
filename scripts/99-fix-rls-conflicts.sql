-- Script para corrigir conflitos de políticas RLS
-- Execute este script no Supabase SQL Editor

-- ========================================
-- CORREÇÃO DE CONFLITOS RLS
-- ========================================

-- 1. Remover políticas conflitantes da tabela users
DROP POLICY IF EXISTS "users_select_dashboard" ON users;

-- 2. Verificar se as políticas originais ainda existem
SELECT 'Políticas atuais na tabela users:' as info;
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public';

-- 3. Recriar a política original se necessário
DO $$
BEGIN
    -- Verificar se a política "Users can view all users" existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' 
        AND policyname = 'Users can view all users'
        AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Users can view all users" ON users
        FOR SELECT USING (true);
        RAISE NOTICE 'Política "Users can view all users" recriada';
    ELSE
        RAISE NOTICE 'Política "Users can view all users" já existe';
    END IF;

    -- Verificar se a política "Admins can do everything with users" existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' 
        AND policyname = 'Admins can do everything with users'
        AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Admins can do everything with users" ON users
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
            )
        );
        RAISE NOTICE 'Política "Admins can do everything with users" recriada';
    ELSE
        RAISE NOTICE 'Política "Admins can do everything with users" já existe';
    END IF;
END $$;

-- 4. Verificar se as funções helper estão funcionando corretamente
SELECT 'Testando função is_admin():' as info;
SELECT public.is_admin() as is_admin_result;

-- 5. Testar acesso direto à tabela users
SELECT 'Testando acesso direto à tabela users:' as info;
SELECT id, email, role FROM users WHERE email = 'sildavysn@gmail.com';

-- 6. Verificar se há outras políticas que possam estar interferindo
SELECT 'Todas as políticas na tabela users:' as info;
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public'
ORDER BY policyname;

-- 7. Verificar se RLS está habilitado corretamente
SELECT 'Status RLS da tabela users:' as info;
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    forcerowsecurity as force_rls
FROM pg_tables 
WHERE tablename = 'users' AND schemaname = 'public';

-- 8. Teste final: simular a consulta do layout.tsx
SELECT 'Teste final - simulando layout.tsx:' as info;
DO $$
DECLARE
    test_user_id UUID;
    test_result RECORD;
BEGIN
    -- Pegar o ID do usuário admin
    SELECT id INTO test_user_id FROM auth.users WHERE email = 'sildavysn@gmail.com';
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'ERRO: Usuário admin não encontrado no auth.users';
        RETURN;
    END IF;
    
    -- Testar a consulta que o layout.tsx faz
    SELECT * INTO test_result FROM users WHERE id = test_user_id;
    
    IF test_result IS NULL THEN
        RAISE NOTICE 'ERRO: Consulta por ID falhou - usuário não encontrado';
        
        -- Testar consulta por email
        SELECT * INTO test_result FROM users WHERE email = 'sildavysn@gmail.com';
        
        IF test_result IS NULL THEN
            RAISE NOTICE 'ERRO: Consulta por email também falhou';
        ELSE
            RAISE NOTICE 'SUCESSO: Usuário encontrado por email - Role: %', test_result.role;
        END IF;
    ELSE
        RAISE NOTICE 'SUCESSO: Usuário encontrado por ID - Role: %', test_result.role;
    END IF;
END $$;

SELECT '=== CORREÇÃO DE RLS CONCLUÍDA ===' as status;