-- Verified menu-photo correction for an already provisioned database.
-- Use only after the database has been baselined. The current live database
-- already received these updates directly and must not run its unbaselined
-- drizzle migrations.

UPDATE meals
SET imageUrl = NULL
WHERE imageUrl LIKE 'https://images.unsplash.com/%'
   OR imageUrl LIKE 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663088610231/%';

UPDATE meals m JOIN meal_categories c ON c.id = m.categoryId
SET m.imageUrl = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663088610231/EUdIhgYfMDYDOhAC.jpeg'
WHERE c.slug = 'rice-pasta' AND m.name = 'Fried Rice';

UPDATE meals m JOIN meal_categories c ON c.id = m.categoryId
SET m.imageUrl = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663088610231/ldRudtsqFhAkLKvo.jpeg'
WHERE c.slug = 'soups' AND m.name = 'Vegetable Soup (Efo Riro)';

UPDATE meals m JOIN meal_categories c ON c.id = m.categoryId
SET m.imageUrl = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663088610231/SZtfWOQcspZYTakS.jpeg'
WHERE c.slug = 'soups' AND m.name = 'Egusi Soup';

UPDATE meals m JOIN meal_categories c ON c.id = m.categoryId
SET m.name = 'Peppered Chicken', m.description = 'Fried chicken in a rich pepper sauce.',
    m.imageUrl = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663088610231/IWuYSoYGllyIwBhl.jpeg'
WHERE c.slug = 'proteins' AND m.name = 'Chicken (Half)';

UPDATE meals m JOIN meal_categories c ON c.id = m.categoryId
SET m.name = 'Peppered Ponmo', m.description = 'Cow skin in signature pepper sauce.',
    m.imageUrl = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663088610231/qAmELVluTawfvMzQ.jpeg'
WHERE c.slug = 'proteins' AND m.name = 'Ponmo (Cow Skin)';

UPDATE meals m JOIN meal_categories c ON c.id = m.categoryId
SET m.imageUrl = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663088610231/dVvNsoiMeCxFxKGM.jpeg'
WHERE c.slug = 'sides' AND m.name = 'Fried Plantain (Dodo)';

UPDATE meals m JOIN meal_categories c ON c.id = m.categoryId
SET m.imageUrl = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663088610231/RwboOpVfMYExmRgK.jpeg'
WHERE c.slug = 'soups' AND m.name = 'Okra Soup';

UPDATE meals m JOIN meal_categories c ON c.id = m.categoryId
SET m.imageUrl = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663088610231/LPZtUFOKiPnxkolZ.jpeg'
WHERE c.slug = 'soups' AND m.name = 'Gbegiri Soup';

UPDATE meals m JOIN meal_categories c ON c.id = m.categoryId
SET m.imageUrl = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663088610231/jflJHPgVOtGYoJna.jpeg'
WHERE c.slug = 'proteins' AND m.name = 'Assorted Meat (Large)';

UPDATE meals m JOIN meal_categories c ON c.id = m.categoryId
SET m.name = 'Fried Beef', m.description = 'Seasoned fried beef in pepper sauce.',
    m.imageUrl = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663088610231/TaPbdvFgqlTKCrXJ.jpeg'
WHERE c.slug = 'proteins' AND m.name = 'Beef (Stewed)';

UPDATE meals m JOIN meal_categories c ON c.id = m.categoryId
SET m.imageUrl = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663088610231/brCdAKcfIyXYCJEh.jpeg'
WHERE c.slug = 'proteins' AND m.name = 'Fried Fish';

UPDATE meals m JOIN meal_categories c ON c.id = m.categoryId
SET m.name = 'Jollof Spaghetti', m.description = 'Spaghetti cooked in rich Nigerian tomato sauce.',
    m.imageUrl = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663088610231/qZOkpJKegSSDcaTA.jpeg'
WHERE c.slug = 'rice-pasta' AND m.name = 'Spaghetti Bolognese';

UPDATE meals m JOIN meal_categories c ON c.id = m.categoryId
SET m.imageUrl = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663088610231/hkAtGHwyQWyUxnDy.jpeg'
WHERE c.slug = 'rice-pasta' AND m.name = 'Jollof Rice';
