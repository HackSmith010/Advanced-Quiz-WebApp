// hash_password.js
import bcrypt from 'bcryptjs';

const password = 'your_password';
const hashedPassword = bcrypt.hashSync(password, 10);

console.log('Your hashed password is:');
console.log(hashedPassword);