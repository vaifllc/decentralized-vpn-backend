const bcrypt = require('bcrypt');

async function testBcrypt() {
    const password = "#0717MikeG";
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    console.log("Original Password:", password);
    console.log("Hashed Password:", hashedPassword);

    // Compare
    const isMatch = await bcrypt.compare(password, hashedPassword);
    console.log("Is Match:", isMatch);
}

testBcrypt();

