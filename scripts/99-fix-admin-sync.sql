-- Script para forçar sincronização do usuário admin
-- Execute este script no Supabase SQL Editor

-- Passo 1: Verificar e corrigir o usuário admin
DO $$
DECLARE
    auth_user_id UUID;
    existing_user_id UUID;
BEGIN
    -- Buscar o ID do usuário no auth.users
    SELECT id INTO auth_user_id 
    FROM auth.users 
    WHERE email = 'sildavysn@gmail.com' 
    LIMIT 1;
    
    IF auth_user_id IS NULL THEN
        RAISE NOTICE 'Usuário não encontrado no auth.users. Certifique-se de que sildavysn@gmail.com fez login pelo menos uma vez.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'ID do usuário no auth: %', auth_user_id;
    
    -- Verificar se já existe na tabela users
    SELECT id INTO existing_user_id 
    FROM users 
    WHERE email = 'sildavysn@gmail.com' 
    LIMIT 1;
    
    IF existing_user_id IS NOT NULL THEN
        RAISE NOTICE 'Usuário já existe na tabela users com ID: %', existing_user_id;
        
        -- Atualizar para ADMIN e sincronizar o ID se necessário
        UPDATE users 
        SET 
            id = auth_user_id,
            role = 'ADMIN',
            name = 'Sildavysn Admin',
            updated_at = NOW()
        WHERE email = 'sildavysn@gmail.com';
        
        RAISE NOTICE 'Usuário atualizado para ADMIN com ID sincronizado';
    ELSE
        -- Inserir novo usuário com o ID correto do auth
        INSERT INTO users (id, email, name, role, phone, created_at, updated_at) 
        VALUES (
            auth_user_id,
            'sildavysn@gmail.com', 
            'Sildavysn Admin', 
            'ADMIN', 
            NULL,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Novo usuário ADMIN criado com ID: %', auth_user_id;
    END IF;
END $$;

-- Verificar resultado
SELECT 'Status final do usuário:' as info;
SELECT 
    u.id as user_table_id,
    au.id as auth_table_id,
    u.email,
    u.name,
    u.role,
    u.created_at,
    u.updated_at,
    CASE 
        WHEN u.id = au.id THEN 'IDs sincronizados ✓'
        ELSE 'IDs NÃO sincronizados ✗'
    END as sync_status
FROM users u
LEFT JOIN auth.users au ON u.email = au.email
WHERE u.email = 'sildavysn@gmail.com';