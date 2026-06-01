-- ============================================================================
-- PRODUTOS REAIS DO KYNITAS BAR
-- ============================================================================
-- IMPORTANTE: Este script vai DELETAR todos os produtos atuais e inserir os corretos
-- Execute primeiro: DELETE FROM products WHERE business_id = 'fd4f11b1-9788-42ef-9d15-7501646ca55f';

-- Limpar produtos existentes
DELETE FROM products WHERE business_id = 'fd4f11b1-9788-42ef-9d15-7501646ca55f';

-- CERVEJAS
INSERT INTO products (id, business_id, name, category, price, cost_price, type, image) VALUES
('1', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Heineken Txoti', 'Cervejas', 75, 75, 'simple', 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200'),
('2', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Heineken Lata', 'Cervejas', 70, 70, 'simple', 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200'),
('3', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Heineken Grande', 'Cervejas', 70, 70, 'simple', 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200'),
('4', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', '2M Gongondza', 'Cervejas', 60, 60, 'simple', 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200'),
('5', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', '2M Lata', 'Cervejas', 55, 55, 'simple', 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200'),
('6', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', '2M Txoti', 'Cervejas', 45, 45, 'simple', 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200'),
('7', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Impala Grande', 'Cervejas', 50, 50, 'simple', 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200'),
('8', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Impala Lata', 'Cervejas', 50, 50, 'simple', 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200'),
('9', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Impala Txoti', 'Cervejas', 40, 40, 'simple', 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200'),
('10', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Laurentina Preta Grande', 'Cervejas', 65, 65, 'simple', 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200'),
('11', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Laurentina Preta Txoti', 'Cervejas', 50, 50, 'simple', 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200'),
('12', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Manica Grande', 'Cervejas', 60, 60, 'simple', 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200'),
('13', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Manica Lata', 'Cervejas', 55, 55, 'simple', 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200'),
('14', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Lite Normal', 'Cervejas', 60, 60, 'simple', 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200'),
('18', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Txilar Garrafa', 'Cervejas', 50, 50, 'simple', 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200'),
('19', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Txilar Txoti', 'Cervejas', 50, 50, 'simple', 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200'),
('20', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Txilar Lata', 'Cervejas', 50, 50, 'simple', 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200'),

-- COOLERS
('15', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Brutal Fruit', 'Coolers', 70, 70, 'simple', 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200'),
('16', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Gold', 'Coolers', 65, 65, 'simple', 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200'),
('17', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Mayfair London Dry', 'Coolers', 75, 75, 'simple', 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200'),
('21', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Savana Dry', 'Coolers', 75, 75, 'simple', 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200'),
('22', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Savana Lemon', 'Coolers', 75, 75, 'simple', 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200'),
('23', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Flying Fish', 'Coolers', 70, 70, 'simple', 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200'),

-- VINHOS
('24', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Vinho Portada', 'Vinhos', 550, 550, 'simple', 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=200'),
('25', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Vinho Pé Branco', 'Vinhos', 500, 500, 'simple', 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=200'),
('26', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Vinho Alandra', 'Vinhos', 500, 500, 'simple', 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=200'),
('27', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Vinho Casa do Bispo', 'Vinhos', 550, 550, 'simple', 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=200'),
('28', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Vinho 4th Street', 'Vinhos', 400, 400, 'simple', 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=200'),
('29', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Vinho Drostdy Hof', 'Vinhos', 390, 390, 'simple', 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=200'),

-- GINS
('30', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Gordon´s Gin', 'Gins', 450, 450, 'simple', 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=200'),
('31', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Caravela Gin Pequena', 'Gins', 100, 100, 'simple', 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=200'),
('32', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Caravela Gin Grande', 'Gins', 350, 350, 'simple', 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=200'),
('33', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Soldier Pequena', 'Gins', 60, 60, 'simple', 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=200'),

-- WHISKYS E LICORES
('34', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Label 9 Horas', 'Whiskys', 65, 65, 'simple', 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=200'),
('35', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Clan Mcgregor', 'Whiskys', 430, 430, 'simple', 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=200'),
('36', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Tipo Tinto', 'Whiskys', 350, 350, 'simple', 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=200'),
('37', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Amarula', 'Licores', 720, 720, 'simple', 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=200'),

-- REFRIGERANTES
('38', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Refresco Lata', 'Refrigerantes', 50, 50, 'simple', 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=200'),
('39', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Refresco Garrafa', 'Refrigerantes', 20, 20, 'simple', 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=200'),
('40', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Refresco Txoti', 'Refrigerantes', 25, 25, 'simple', 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=200'),
('41', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Refresco 1L', 'Refrigerantes', 65, 65, 'simple', 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=200'),
('42', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Refresco 2L', 'Refrigerantes', 110, 110, 'simple', 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=200'),
('43', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Refresco 1.5L', 'Refrigerantes', 85, 85, 'simple', 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=200'),
('49', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Fizzy', 'Refrigerantes', 20, 20, 'simple', 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=200'),
('51', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Lemon Twist', 'Refrigerantes', 50, 50, 'simple', 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=200'),
('52', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Schweppes', 'Refrigerantes', 50, 50, 'simple', 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=200'),

-- SUMOS
('44', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Cappy Txoti', 'Sumos', 35, 35, 'simple', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=200'),
('45', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Cappy 1L', 'Sumos', 70, 70, 'simple', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=200'),
('46', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Compal 500mL', 'Sumos', 70, 70, 'simple', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=200'),
('47', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Compal 1L', 'Sumos', 130, 130, 'simple', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=200'),
('48', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Santal 500mL', 'Sumos', 70, 70, 'simple', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=200'),
('50', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Ceres', 'Sumos', 130, 130, 'simple', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=200'),

-- ENERGÉTICOS
('53', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Dragon', 'Energéticos', 50, 50, 'simple', 'https://images.unsplash.com/photo-1622543925917-763c34f6a1a7?w=200'),
('54', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Monster Energy', 'Energéticos', 85, 85, 'simple', 'https://images.unsplash.com/photo-1622543925917-763c34f6a1a7?w=200'),
('55', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Redbull', 'Energéticos', 100, 100, 'simple', 'https://images.unsplash.com/photo-1622543925917-763c34f6a1a7?w=200'),
('56', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Frozzy', 'Energéticos', 25, 25, 'simple', 'https://images.unsplash.com/photo-1622543925917-763c34f6a1a7?w=200'),

-- ÁGUAS
('57', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Água Pequena', 'Águas', 25, 25, 'simple', 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=200'),
('58', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Água Grande', 'Águas', 50, 50, 'simple', 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=200'),

-- BOLACHAS
('59', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Bolacha Maria', 'Bolachas', 25, 25, 'simple', 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=200'),
('60', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Bolacha Água e Sal', 'Bolachas', 25, 25, 'simple', 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=200'),
('61', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Bolacha Cocô', 'Bolachas', 25, 25, 'simple', 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=200'),
('62', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Bolacha Pica Pau', 'Bolachas', 5, 5, 'simple', 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=200'),
('63', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Doritos', 'Bolachas', 100, 100, 'simple', 'https://images.unsplash.com/photo-1613919113640-25732ec5e61f?w=200'),

-- CIGARROS
('64', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Cigarro GT', 'Cigarros', 100, 100, 'simple', 'https://images.unsplash.com/photo-1519181245277-cffeb31da2e3?w=200'),
('65', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Cigarro Pall Mall Azul', 'Cigarros', 120, 120, 'simple', 'https://images.unsplash.com/photo-1519181245277-cffeb31da2e3?w=200'),

-- KOMBUCHA
('66', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Kombucha', 'Bebidas', 50, 50, 'simple', 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=200'),

-- REFEIÇÕES
('meal1', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Dose Frango com Arroz e Salada', 'Refeições', 180, 100, 'simple', 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=200'),
('meal2', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Dose Frango com Batata e Salada', 'Refeições', 240, 130, 'simple', 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=200'),
('meal3', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Frango Inteiro com Arroz e Salada', 'Refeições', 650, 400, 'simple', 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=200'),
('meal4', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Frango Inteiro com Batata e Salada', 'Refeições', 700, 450, 'simple', 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=200'),

-- PEIXES
('meal5', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Peixe 150mt', 'Peixes', 150, 150, 'simple', 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=200'),
('meal6', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Peixe 200mt', 'Peixes', 200, 200, 'simple', 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=200'),
('meal7', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Peixe 250mt', 'Peixes', 250, 250, 'simple', 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=200'),

-- CARNES
('meal8', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Carne de Porco (por Kg)', 'Carnes', 650, 650, 'simple', 'https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?w=200'),
('meal9', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Guisado de Carne de Vaca com Arroz', 'Refeições', 150, 150, 'simple', 'https://images.unsplash.com/photo-1595295333158-4742f28fbd85?w=200'),

-- ACOMPANHAMENTOS
('acomp1', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Arroz', 'Acompanhamentos', 50, 50, 'simple', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200'),
('acomp2', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Batata', 'Acompanhamentos', 60, 60, 'simple', 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=200'),
('acomp3', 'fd4f11b1-9788-42ef-9d15-7501646ca55f', 'Salada', 'Acompanhamentos', 30, 30, 'simple', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200');

-- VERIFICAÇÃO
SELECT COUNT(*) as total_produtos FROM products WHERE business_id = 'fd4f11b1-9788-42ef-9d15-7501646ca55f';
