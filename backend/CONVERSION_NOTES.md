# PostgreSQL to MySQL Conversion Notes

## Major Changes Made:

1. **Database Driver**: Changed from `pg` to `mysql2`
2. **Placeholders**: Changed from `$1, $2...` to `?`
3. **Result Format**: Changed from `result.rows` to `[rows]` destructuring
4. **Arrays**: Converted PostgreSQL `TEXT[]` to MySQL `JSON` columns
5. **Serial IDs**: Changed `SERIAL` to `INT AUTO_INCREMENT`
6. **ON CONFLICT**: Changed to `ON DUPLICATE KEY UPDATE`
7. **ILIKE**: Changed to `LIKE` (case-insensitive with proper escaping)
8. **Array Operators**: Replaced `&&` with `JSON_CONTAINS()` functions

## Remaining Files to Update:

- [x] authController.js
- [x] patientController.js  
- [ ] researcherController.js
- [ ] trialsController.js
- [ ] publicationsController.js
- [ ] expertsController.js
- [ ] forumsController.js
- [ ] favoritesController.js

## MySQL-Specific Functions Used:

- `JSON_CONTAINS()` - Check if JSON array contains value
- `JSON_QUOTE()` - Safely quote JSON strings
- `ON DUPLICATE KEY UPDATE` - Handle conflicts

