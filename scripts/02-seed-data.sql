-- Insert admin user
INSERT INTO users (id, email, name, phone, role) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'admin@imperalina.com', 'Administrador', '(11) 99999-9999', 'ADMIN');

-- Insert professional users
INSERT INTO users (id, email, name, phone, role) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'maria@imperalina.com', 'Maria Silva', '(11) 98888-8888', 'PROFESSIONAL'),
  ('b0000000-0000-0000-0000-000000000002', 'joana@imperalina.com', 'Joana Santos', '(11) 97777-7777', 'PROFESSIONAL'),
  ('b0000000-0000-0000-0000-000000000003', 'ana@imperalina.com', 'Ana Costa', '(11) 96666-6666', 'PROFESSIONAL');

-- Insert client users
INSERT INTO users (id, email, name, phone, role) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'cliente1@email.com', 'Carla Oliveira', '(11) 95555-5555', 'CLIENT'),
  ('c0000000-0000-0000-0000-000000000002', 'cliente2@email.com', 'Paula Souza', '(11) 94444-4444', 'CLIENT'),
  ('c0000000-0000-0000-0000-000000000003', 'cliente3@email.com', 'Fernanda Lima', '(11) 93333-3333', 'CLIENT');

-- Insert professionals
INSERT INTO professionals (id, user_id, specialties, bio, color) VALUES
  ('p0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 
   ARRAY['Corte', 'Coloração', 'Tratamentos'], 
   'Especialista em coloração e cortes modernos com 10 anos de experiência.', 
   '#EC4899'),
  ('p0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 
   ARRAY['Manicure', 'Pedicure', 'Unhas Artísticas'], 
   'Designer de unhas com especialização em nail art.', 
   '#8B5CF6'),
  ('p0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 
   ARRAY['Maquiagem', 'Design de Sobrancelhas'], 
   'Maquiadora profissional e designer de sobrancelhas certificada.', 
   '#F59E0B');

-- Insert services
INSERT INTO services (name, description, duration, price, professional_id, is_active) VALUES
  -- Maria's services
  ('Corte Feminino', 'Corte de cabelo feminino com lavagem e finalização', 60, 80.00, 'p0000000-0000-0000-0000-000000000001', true),
  ('Coloração Completa', 'Coloração completa com produtos de alta qualidade', 120, 200.00, 'p0000000-0000-0000-0000-000000000001', true),
  ('Hidratação Profunda', 'Tratamento de hidratação profunda para cabelos danificados', 90, 120.00, 'p0000000-0000-0000-0000-000000000001', true),
  ('Escova Progressiva', 'Escova progressiva com produtos premium', 180, 350.00, 'p0000000-0000-0000-0000-000000000001', true),
  
  -- Joana's services
  ('Manicure Completa', 'Manicure com esmaltação tradicional', 45, 40.00, 'p0000000-0000-0000-0000-000000000002', true),
  ('Pedicure Completa', 'Pedicure com esmaltação tradicional', 60, 50.00, 'p0000000-0000-0000-0000-000000000002', true),
  ('Unhas em Gel', 'Aplicação de unhas em gel com design personalizado', 90, 100.00, 'p0000000-0000-0000-0000-000000000002', true),
  ('Nail Art', 'Design artístico em unhas', 30, 60.00, 'p0000000-0000-0000-0000-000000000002', true),
  
  -- Ana's services
  ('Maquiagem Social', 'Maquiagem para eventos sociais', 60, 150.00, 'p0000000-0000-0000-0000-000000000003', true),
  ('Maquiagem para Noivas', 'Maquiagem especial para noivas com teste prévio', 90, 300.00, 'p0000000-0000-0000-0000-000000000003', true),
  ('Design de Sobrancelhas', 'Design e modelagem de sobrancelhas', 30, 50.00, 'p0000000-0000-0000-0000-000000000003', true),
  ('Micropigmentação', 'Micropigmentação de sobrancelhas', 120, 800.00, 'p0000000-0000-0000-0000-000000000003', true);

-- Insert schedules (Monday to Friday, 9:00 to 18:00)
INSERT INTO schedules (professional_id, day_of_week, start_time, end_time, is_active) VALUES
  -- Maria's schedule
  ('p0000000-0000-0000-0000-000000000001', 1, '09:00', '18:00', true),
  ('p0000000-0000-0000-0000-000000000001', 2, '09:00', '18:00', true),
  ('p0000000-0000-0000-0000-000000000001', 3, '09:00', '18:00', true),
  ('p0000000-0000-0000-0000-000000000001', 4, '09:00', '18:00', true),
  ('p0000000-0000-0000-0000-000000000001', 5, '09:00', '18:00', true),
  ('p0000000-0000-0000-0000-000000000001', 6, '10:00', '16:00', true),
  
  -- Joana's schedule
  ('p0000000-0000-0000-0000-000000000002', 1, '10:00', '19:00', true),
  ('p0000000-0000-0000-0000-000000000002', 2, '10:00', '19:00', true),
  ('p0000000-0000-0000-0000-000000000002', 3, '10:00', '19:00', true),
  ('p0000000-0000-0000-0000-000000000002', 4, '10:00', '19:00', true),
  ('p0000000-0000-0000-0000-000000000002', 5, '10:00', '19:00', true),
  
  -- Ana's schedule
  ('p0000000-0000-0000-0000-000000000003', 2, '09:00', '17:00', true),
  ('p0000000-0000-0000-0000-000000000003', 3, '09:00', '17:00', true),
  ('p0000000-0000-0000-0000-000000000003', 4, '09:00', '17:00', true),
  ('p0000000-0000-0000-0000-000000000003', 5, '09:00', '17:00', true),
  ('p0000000-0000-0000-0000-000000000003', 6, '09:00', '15:00', true);

-- Insert some sample appointments
INSERT INTO appointments (client_id, professional_id, service_id, date, start_time, end_time, status, notes) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000001', 
   (SELECT id FROM services WHERE name = 'Corte Feminino' LIMIT 1),
   CURRENT_DATE + INTERVAL '1 day', '10:00', '11:00', 'CONFIRMED', 'Cliente preferencial'),
  
  ('c0000000-0000-0000-0000-000000000002', 'p0000000-0000-0000-0000-000000000002', 
   (SELECT id FROM services WHERE name = 'Manicure Completa' LIMIT 1),
   CURRENT_DATE + INTERVAL '1 day', '14:00', '14:45', 'PENDING', NULL),
  
  ('c0000000-0000-0000-0000-000000000003', 'p0000000-0000-0000-0000-000000000003', 
   (SELECT id FROM services WHERE name = 'Maquiagem Social' LIMIT 1),
   CURRENT_DATE + INTERVAL '2 days', '15:00', '16:00', 'CONFIRMED', 'Evento às 19h');
