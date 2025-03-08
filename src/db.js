const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

// Determine correct database path
let dbPath;

// Check if we're in development or production
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

if (isDev) {
  // In development, store the database in the src directory
  dbPath = path.join(__dirname, 'users.db');
} else {
  // In production, we'll copy from original location to user data folder if needed
  const userDataPath = app.getPath('userData');
  dbPath = path.join(userDataPath, 'users.db');
  
  // Check if we need to copy the database from resources to user data
  const originalDbPath = path.join(process.resourcesPath, 'src', 'users.db');
  
  // Copy the database if it exists in resources but not in user data
  if (fs.existsSync(originalDbPath) && !fs.existsSync(dbPath)) {
    try {
      fs.copyFileSync(originalDbPath, dbPath);
      console.log('Database copied from resources to user data folder');
    } catch (err) {
      console.error('Failed to copy database:', err);
    }
  }
}

console.log('Using database at:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Database error:', err.message);
    else console.log('Connected to the database.');
});

db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        actor_type TEXT NOT NULL DEFAULT 'salesperson'
    )
`);


// Add a new user
const addUser = (user) => {
    return new Promise((resolve, reject) => {
        const { username, email, password } = user;

        db.get(
            `SELECT * FROM users WHERE username = ?`,
            [username],
            (err, row) => {
                if (err) {
                    reject(err);
                } else if (row) {
                    reject(new Error('Username already exists.'));
                } else {
                    db.run(
                        `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`,
                        [username, email, password],
                        function (err) {
                            if (err) reject(err);
                            else resolve(this.lastID);
                        }
                    );
                }
            }
        );
    });
};
// db.run(`
//     ALTER TABLE purchasesreturn 
//     ADD COLUMN receive_amount REAL NOT NULL DEFAULT 0.00
// `);



const validateUser = (credentials) => {
    return new Promise((resolve, reject) => {
        const { username, password } = credentials;
        
        db.get(
            `SELECT id, username, password, actor_type FROM users WHERE username = ?`,
            [username],
            async (err, row) => {
                if (err) {
                    reject(err);
                } else if (!row) {
                    resolve({ success: false, error: 'User not found' });
                } else {
                    try {
                        // In a real application, you should use proper password hashing
                        // This is a simplified example
                        if (password === row.password) {
                            resolve({
                                success: true,
                                userId: row.id,
                                role: row.actor_type,
                                username: row.username
                            });
                        } else {
                            resolve({ success: false, error: 'Invalid password' });
                        }
                    } catch (error) {
                        reject(error);
                    }
                }
            }
        );
    });
};





// Find user by username and password
const findUser = (username, password) => {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT * FROM users WHERE username = ? AND password = ?`,
            [username, password],
            (err, row) => {
                if (err) {
                    reject(err);
                } else if (row) {
                    resolve(row); // Password matches
                } else {
                    reject(new Error('Invalid username or password.'));
                }
            }
        );
    });
};

// Fetch all users
// Function to get all users (minimal info)
const getAllUsers = () => {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT id, username FROM users`,
            [],
            (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            }
        );
    });
};

// Function to get all users with details
const getAllUsersDetails = () => {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT id, username, email, actor_type FROM users`,
            [],
            (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            }
        );
    });
};

// Function to delete a user
const deleteUser = (userId) => {
    return new Promise((resolve, reject) => {
        db.run(
            `DELETE FROM users WHERE id = ?`,
            [userId],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: userId, changes: this.changes });
                }
            }
        );
    });
};
// Update user's password
const updatePassword = (userId, newPassword) => {
    return new Promise((resolve, reject) => {
        const query = `UPDATE users SET password = ? WHERE id = ?`;
        console.log(`Executing query: ${query} with values: ${newPassword}, ${userId}`); // Log the query and values

        db.run(query, [newPassword, userId], function (err) {
            if (err) {
                console.error("Error updating password:", err);
                reject(err);
            } else {
                if (this.changes === 0) {
                    console.error("No rows were updated, user ID not found");
                    reject(new Error('User not found or password was not changed.'));
                } else {
                    console.log("Password updated successfully");
                    resolve({ message: "Password updated successfully!" });
                }
            }
        });
    });
};
// Create table for suppliers if it doesn't exist
db.run(`
    CREATE TABLE IF NOT EXISTS suppliers (
        supplier_id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_name TEXT NOT NULL,
        email TEXT NOT NULL,
        address TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// Add a new supplier
const addSupplier = (supplier) => {
    return new Promise((resolve, reject) => {
        const { supplierName, email, address, phoneNumber } = supplier;

        db.run(
            `INSERT INTO suppliers (supplier_name, email, address, phone_number) VALUES (?, ?, ?, ?)`,
            [supplierName, email, address, phoneNumber],
            function (err) {
                if (err) reject(err);
                else resolve(this.lastID); // Resolves the inserted supplier's ID
            }
        );
    });
};

// Get all suppliers
const getSuppliers = () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT supplier_id, supplier_name, email, address, phone_number FROM suppliers', [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

// Delete a supplier
const deleteSupplier = (supplierId) => {
    return new Promise((resolve, reject) => {
        // Disable foreign key checks to see if that's causing the issue
        db.run('PRAGMA foreign_keys = OFF');

        const query = 'DELETE FROM suppliers WHERE supplier_id = ?';
        db.run(query, [supplierId], function (err) {
            if (err) {
                console.error('Error deleting supplier:', err.message);
                reject(new Error(`Error deleting supplier: ${err.message}`));
            } else {
                if (this.changes > 0) {
                    console.log(`Supplier with ID ${supplierId} deleted successfully.`);
                    resolve({ success: true });
                } else {
                    console.log(`Supplier with ID ${supplierId} not found.`);
                    resolve({ success: false, error: 'Supplier not found' });
                }
            }
        });

        // Re-enable foreign key checks
        db.run('PRAGMA foreign_keys = ON');
    });
};


const updateSupplier = (supplier) => {
    return new Promise((resolve, reject) => {
        const { supplier_id, supplierName, email, address, phoneNumber } = supplier;

        // SQL query to update the supplier record
        const query = `
            UPDATE suppliers 
            SET supplier_name = ?, email = ?, address = ?, phone_number = ? 
            WHERE supplier_id = ?
        `;

        db.run(query, [supplierName, email, address, phoneNumber, supplier_id], function (err) {
            if (err) {
                reject(err); // Reject the promise if there's an error
            } else {
                resolve({ success: true }); // Resolve with success if update is successful
            }
        });
    });
};

// Create table for companies if it doesn't exist
db.run(`
    CREATE TABLE IF NOT EXISTS companies (
        company_id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_name TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// Add a new company
const addCompany = (company) => {
    return new Promise((resolve, reject) => {
        const { companyName } = company;

        db.run(
            `INSERT INTO companies (company_name) VALUES (?)`,
            [companyName],
            function (err) {
                if (err) reject(err);
                else resolve(this.lastID); // Resolves the inserted company's ID
            }
        );
    });
};

// Get all companies
const getCompanies = () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT company_id, company_name, timestamp FROM companies', [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

// Delete a company
// db.js - Delete company function
const deleteCompany = (companyId) => {
    return new Promise((resolve, reject) => {
        const query = 'DELETE FROM companies WHERE company_id = ?';
        db.run(query, [companyId], function (err) {
            if (err) {
                console.error('Error deleting company:', err.message);
                reject(new Error(`Error deleting company: ${err.message}`));
            } else {
                if (this.changes > 0) {
                    resolve({ success: true });
                } else {
                    resolve({ success: false, error: 'Company not found' });
                }
            }
        });
    });
};



// Update the error handling in your updateCompany function
const updateCompany = (company) => {
    return new Promise((resolve, reject) => {
        const { company_id, companyName } = company;

        console.log('[updateCompany] Input:', { company_id, companyName });

        if (!company_id || !companyName) {
            const error = new Error('Missing required fields');
            console.error('[updateCompany] Validation Error:', error);
            reject(error);
            return;
        }

        const query = `UPDATE companies SET company_name = ? WHERE company_id = ?`;
        console.log('[updateCompany] Query:', query);

        db.run(query, [companyName, company_id], function(err) {
            if (err) {
                console.error('[updateCompany] Database Error:', err);
                reject(err);
                return;
            }
            
            console.log('[updateCompany] Rows affected:', this.changes);
            resolve({
                success: true,
                changes: this.changes,
                message: 'Company updated successfully'
            });
        });
    });
};

// Create the categories table if it doesn't exist
db.run(`
    CREATE TABLE IF NOT EXISTS categories (
        category_id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`);

// Add a new category
const addCategory = (categoryName) => {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO categories (category_name) VALUES (?)`,
            [categoryName],
            function (err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
};

// Fetch all categories
const getCategories = () => {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM categories`, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const updateCategory = (categoryId, newCategoryName) => {
    return new Promise((resolve, reject) => {
        // Log input parameters to debug
        console.log('Updating category with ID:', categoryId, 'New Name:', newCategoryName);

        db.run(
            `UPDATE categories SET category_name = ? WHERE category_id = ?`,
            [newCategoryName, categoryId],
            function (err) {
                if (err) {
                    console.error('Database error:', err.message);
                    reject(err);
                } else {
                    console.log(`Rows updated: ${this.changes}`);
                    if (this.changes === 0) {
                        console.log('No rows updated. Category ID might not exist.');
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                }
            }
        );
    });
};


// Delete a category
// Delete a category and its subcategories
const deleteCategory = (categoryId) => {
    return new Promise((resolve, reject) => {
        // Begin a transaction to ensure data integrity
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            // First delete all subcategories associated with the category
            db.run(
                `DELETE FROM subcategories WHERE category_id = ?`,
                [categoryId],
                function (err) {
                    if (err) {
                        db.run('ROLLBACK');
                        console.error('Error deleting subcategories:', err);
                        reject(err);
                        return;
                    }
                    
                    // Then delete the category itself
                    db.run(
                        `DELETE FROM categories WHERE category_id = ?`,
                        [categoryId],
                        function (err) {
                            if (err) {
                                db.run('ROLLBACK');
                                console.error('Error deleting category:', err);
                                reject(err);
                                return;
                            }
                            
                            // Commit the transaction if everything succeeded
                            db.run('COMMIT');
                            resolve(this.changes > 0);
                        }
                    );
                }
            );
        });
    });
};
db.run(`
    CREATE TABLE IF NOT EXISTS subcategories (
        subcategory_id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        subcategory_name TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(category_id)
    )
`);

// Function to add a subcategory
const addSubcategory = (categoryId, subcategoryName) => {
    return new Promise((resolve, reject) => {
        console.log("Received categoryId:", categoryId); // Log categoryId
        console.log("Received subcategoryName:", subcategoryName); // Log subcategoryName

        db.run(
            `INSERT INTO subcategories (category_id, subcategory_name) VALUES (?, ?)`,
            [categoryId, subcategoryName],
            function (err) {
                if (err) {
                    console.error("Error inserting subcategory:", err.message);
                    reject(err);
                } else {
                    resolve({ success: true });
                }
            }
        );
    });
};



const getAllSubcategories = () => {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM subcategories`;
        db.all(query, [], (err, rows) => {
            if (err) {
                console.error("Error fetching subcategories:", err);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};


const deleteSubcategory = (subcategoryId) => {
    return new Promise((resolve, reject) => {
        const query = `DELETE FROM subcategories WHERE subcategory_id = ?`;
        db.run(query, [subcategoryId], function(err) {
            if (err) {
                console.error("Error deleting subcategory:", err);
                reject(err);
            } else {
                resolve({ changes: this.changes }); // This tells how many rows were affected
            }
        });
    });
};

const updateSubcategoryInDB = (subcategoryId, newName) => {
    return new Promise((resolve, reject) => {
        const query = `UPDATE subcategories SET subcategory_name = ? WHERE subcategory_id = ?`;
        db.run(query, [newName, subcategoryId], function (err) {
            if (err) {
                reject(err);
            } else {
                resolve({ affectedRows: this.changes });  // Number of rows affected
            }
        });
    });
};


const getUserProfile = (username, password) => {
    return new Promise((resolve, reject) => {
        const query = `SELECT id, username, password, email FROM users WHERE username = ? AND password = ?`;
        db.get(query, [username, password], (err, row) => {
            if (err) {
                console.error('Error fetching user profile:', err.message);
                reject(err);
            } else {
                resolve(row); // Resolving with the user data
            }
        });
    });
};

db.run(` CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    productCode TEXT,
    productName TEXT,
 
    currentDate TEXT,
    category TEXT,
    subcategory TEXT,

    companyName TEXT,
    rackNo TEXT,
    supplier TEXT,
    additionalComment TEXT,
 
    salePrice REAL
)`);

const insertProduct = (productData) => {
return new Promise((resolve, reject) => {
    const { productCode, productName, currentDate, category, subcategory, companyName, rackNo, supplier, additionalComment, purchaseConvUnit, salePrice } = productData;
    
    console.log("Inserting product with data:", productData);  // Log the data

    const query = `
        INSERT INTO products (productCode, productName,  currentDate, category, subcategory, companyName, rackNo, supplier, additionalComment,  salePrice)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(query, [productCode, productName,  currentDate, category, subcategory,companyName, rackNo, supplier, additionalComment,  salePrice], function(err) {
        if (err) {
            console.error("Error inserting product:", err);
            reject(err);
        } else {
            console.log("Product inserted with ID:", this.lastID);
            resolve(this.lastID);
        }
    });
});
};

const getAllProducts = () => {
return new Promise((resolve, reject) => {
    db.all('SELECT * FROM products', [], (err, rows) => {
        if (err) {
            reject(err);
        } else {
            resolve(rows);
        }
    });
});
};
const deleteProduct = (id) => {
return new Promise((resolve, reject) => {
  db.run('DELETE FROM products WHERE id = ?', [id], function (err) {
    if (err) {
      reject(err);
    } else {
      resolve({ success: true, message: 'Product deleted successfully!' });
    }
  });
});
};
const updateProduct = (id, productData) => {
    return new Promise((resolve, reject) => {
      const { productCode, productName,  currentDate, category, subcategory, 
              companyName, rackNo, supplier, 
              additionalComment,  salePrice } = productData;
      
      const query = `
        UPDATE products 
        SET productCode = ?, productName = ?, currentDate = ?,
            category = ?, subcategory = ?,  companyName = ?, rackNo = ?, supplier = ?, additionalComment = ?,
         salePrice = ?
        WHERE id = ?
      `;
    
      db.run(query, [
        productCode, productName, currentDate, category, subcategory,
       companyName, rackNo, supplier,
        additionalComment, salePrice, id
      ], function(err) {
        if (err) {
          console.error("Error updating product:", err);
          reject(err);
        } else {
          resolve({ success: true, message: 'Product updated successfully!' });
        }
      });
    });
    };

// Create table for customers if it doesn't exist
db.run(`
    CREATE TABLE IF NOT EXISTS customers (
        customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        address TEXT NOT NULL,
        shop_name TEXT NOT NULL,
        customer_cnic TEXT NOT NULL,
        area_code TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);
const addCustomer = (customer) => {
    return new Promise((resolve, reject) => {
        const { customerName,  address, phoneNumber, shopName, customerCnic, areaCode } = customer;
        const query = `INSERT INTO customers (customer_name, address, phone_number, shop_name, customer_cnic, area_code) VALUES (?,  ?, ?, ?, ?, ?)`;
        db.run(query, [customerName,  address, phoneNumber, shopName, customerCnic, areaCode], function(err) {
            if (err) {
                console.error("Error adding customer:", err.message);
                reject(err);
            } else {
                resolve({ success: true, customerId: this.lastID }); // Return the inserted ID
            }
        });
    });
};


// Get all customers from the database
const getCustomers = () => {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM customers`;
        db.all(query, [], (err, rows) => {
            if (err) {
                console.error("Error fetching customers:", err.message);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

// Update customer in the database
const updateCustomer = (customer) => {
    return new Promise((resolve, reject) => {
        const { customer_id, customerName, address, phoneNumber, shopName, customerCnic, areaCode } = customer;
        const query = `UPDATE customers SET customer_name = ?,  address = ?, phone_number = ?, shop_name = ?, customer_cnic = ?, area_code = ? WHERE customer_id = ?`;
        db.run(query, [customerName,  address, phoneNumber, shopName, customerCnic, areaCode, customer_id], function (err) {
            if (err) {
                console.error("Error updating customer:", err.message);
                reject(err);
            } else {
                resolve({ success: true, affectedRows: this.changes }); // Return number of affected rows
            }
        });
    });
};


// Delete customer from the database
const deleteCustomer = (customerId) => {
    return new Promise((resolve, reject) => {
        const query = `DELETE FROM customers WHERE customer_id = ?`;
        db.run(query, [customerId], function (err) {
            if (err) {
                console.error("Error deleting customer:", err.message);
                reject(err);
            } else {
                resolve({ success: true, changes: this.changes }); // Return how many rows were affected
            }
        });
    });
};
////purchase
db.run(`
    CREATE TABLE IF NOT EXISTS purchases (
        purchase_id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT NOT NULL,
        date TEXT NOT NULL,
        bill_no TEXT NOT NULL,
        supplier_name TEXT NOT NULL,
        payment_method TEXT NOT NULL,
        comments TEXT,
        discount_type TEXT,
        discount_amount REAL,
        tax_type TEXT NOT NULL,
        tax_amount REAL,
        grand_total REAL NOT NULL,
        paid_amount REAL NOT NULL,
        due_amount REAL NOT NULL,
        products TEXT NOT NULL,  -- Stores JSON array of products
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// Create stock table
db.run(`
    CREATE TABLE IF NOT EXISTS stock (
        stock_id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_name TEXT NOT NULL,
        product_code TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);



const addPurchase = (purchaseData) => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            try {
                // Convert products array to JSON string
                const productsJson = JSON.stringify(purchaseData.products);

                // Insert purchase record
                db.run(
                    `INSERT INTO purchases (
                        invoice_number, date, bill_no, supplier_name,
                        payment_method, comments, tax_type, tax_amount,
                        discount_type, discount_amount, 
                        grand_total, paid_amount, due_amount, products
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        purchaseData.invoiceNumber,
                        purchaseData.date,
                        purchaseData.billNo,
                        purchaseData.supplierName,
                        purchaseData.paymentMethod,
                        purchaseData.comments,
                        purchaseData.taxType,
                        purchaseData.taxAmount,
                        purchaseData.discountType,  // New field
                        purchaseData.discountAmount,  // New field
                        purchaseData.grandTotal,
                        purchaseData.paidAmount,
                        purchaseData.dueAmount,
                        productsJson
                    ],
                    async function(err) {
                        if (err) {
                            console.error('Error inserting purchase:', err);
                            throw err;
                        }
                        
                        const purchaseId = this.lastID;
                        
                        // Update stock for each product
                        for (const product of purchaseData.products) {
                            try {
                               
                                await updateStock({
                                    productName: product.productName,
                                    productCode: product.productCode,
                                    quantity: product.purchasePack // Changed from purchaseUnitQty to quantity
                                });
                            } catch (stockErr) {
                                console.error('Error updating stock:', stockErr);
                                throw stockErr;
                            }
                        }

                        db.run('COMMIT');
                        resolve({ success: true, purchaseId });
                    }
                );
            } catch (error) {
                console.error('Transaction error:', error);
                db.run('ROLLBACK');
                reject(error);
            }
        });
    });
};


const getAllPurchases = () => {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT * FROM purchases ORDER BY purchase_id DESC`,
            [],
            (err, rows) => {
                if (err) {
                    console.error('Database error:', err);
                    reject(err);
                    return;
                }

                try {
                    // Process each row
                    const formattedRows = rows.map(row => {
                        // Parse the products JSON string
                        const products = JSON.parse(row.products);
                        
                        // Format the row data
                        return {
                            invoiceNumber: row.invoice_number,
                            date: row.date,
                            billNo: row.bill_no,
                            supplierName: row.supplier_name,
                            paymentMethod: row.payment_method,
                            comments: row.comments,
                            taxType: row.tax_type,
                            taxAmount: Number(row.tax_amount || 0),
                            grandTotal: Number(row.grand_total || 0),
                            paidAmount: Number(row.paid_amount || 0),
                            dueAmount: Number(row.due_amount || 0),
                            products: products.map(product => ({
                                productCode: product.productCode,
                                productName: product.productName,
                                costPrice: Number(product.costPrice || 0),
                                purchasePack: Number(product.purchasePack || 0),
                                totalAmount: Number(product.totalAmount || 0)
                            }))
                        };
                    });

                    console.log('Formatted rows:', formattedRows); // Debug log
                    resolve(formattedRows);
                } catch (error) {
                    console.error('Error processing rows:', error);
                    reject(error);
                }
            }
        );
    });
};


// Function to delete purchase and update stock
// Function to delete purchase and update stock
const deletePurchase = (invoiceNumber) => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            // First get the purchase details to know what stock to update
            db.get(
                'SELECT products FROM purchases WHERE invoice_number = ?',
                [invoiceNumber],
                async (err, row) => {
                    if (err) {
                        console.error('Error fetching purchase:', err);
                        db.run('ROLLBACK');
                        reject(err);
                        return;
                    }

                    if (!row) {
                        db.run('ROLLBACK');
                        reject(new Error('Purchase not found'));
                        return;
                    }

                    try {
                        let products;
                        // Safely parse the products JSON
                        try {
                            products = JSON.parse(row.products);
                            if (!Array.isArray(products)) {
                                throw new Error('Products data is not an array');
                            }
                        } catch (parseError) {
                            console.error('Error parsing products JSON:', parseError);
                            db.run('ROLLBACK');
                            reject(new Error('Invalid products data format'));
                            return;
                        }

                        // Update stock for each product
                        for (const product of products) {
                            // Ensure we have valid product code
                            if (!product.productCode) {
                                console.warn('Skipping product with missing product code');
                                continue;
                            }

                            // Ensure quantity is a valid number
                            const quantity = Number(product.purchasePack || product.purchaseUnitQty || 0);
                            if (isNaN(quantity) || quantity <= 0) {
                                console.warn(`Skipping product ${product.productCode} with invalid quantity: ${quantity}`);
                                continue;
                            }

                            // Check if product exists in stock
                            const stockItem = await new Promise((resolveStock, rejectStock) => {
                                db.get(
                                    'SELECT * FROM stock WHERE product_code = ?', 
                                    [product.productCode], 
                                    (stockErr, stockRow) => {
                                        if (stockErr) {
                                            console.error('Error checking stock:', stockErr);
                                            rejectStock(stockErr);
                                        } else {
                                            resolveStock(stockRow);
                                        }
                                    }
                                );
                            });
                            
                            if (!stockItem) {
                                console.warn(`Product ${product.productCode} not found in stock, skipping stock update`);
                                continue; // Skip this product
                            }

                            // Ensure we don't reduce stock below zero
                            if (stockItem.quantity < quantity) {
                                console.warn(`Cannot reduce stock below 0 for product: ${product.productCode}. Current: ${stockItem.quantity}, To remove: ${quantity}`);
                                // Option 1: Skip this product
                                // continue;
                                
                                // Option 2: Set stock to zero instead of negative
                                await new Promise((resolveUpdate, rejectUpdate) => {
                                    db.run(
                                        `UPDATE stock 
                                         SET quantity = 0,
                                             last_updated = CURRENT_TIMESTAMP 
                                         WHERE product_code = ?`,
                                        [product.productCode],
                                        (updateErr) => {
                                            if (updateErr) {
                                                console.error('Error updating stock to zero:', updateErr);
                                                rejectUpdate(updateErr);
                                            } else {
                                                resolveUpdate();
                                            }
                                        }
                                    );
                                });
                            } else {
                                // Normal case: reduce stock by the purchased quantity
                                await new Promise((resolveUpdate, rejectUpdate) => {
                                    db.run(
                                        `UPDATE stock 
                                         SET quantity = quantity - ?,
                                             last_updated = CURRENT_TIMESTAMP 
                                         WHERE product_code = ?`,
                                        [quantity, product.productCode],
                                        (updateErr) => {
                                            if (updateErr) {
                                                console.error('Error updating stock:', updateErr);
                                                rejectUpdate(updateErr);
                                            } else {
                                                resolveUpdate();
                                            }
                                        }
                                    );
                                });
                            }
                        }

                        // After all stock updates, delete the purchase record
                        db.run(
                            'DELETE FROM purchases WHERE invoice_number = ?',
                            [invoiceNumber],
                            (deleteErr) => {
                                if (deleteErr) {
                                    console.error('Error deleting purchase:', deleteErr);
                                    db.run('ROLLBACK');
                                    reject(deleteErr);
                                } else {
                                    db.run('COMMIT');
                                    resolve({ success: true, message: 'Purchase deleted successfully' });
                                }
                            }
                        );
                    } catch (processingError) {
                        console.error('Error processing purchase deletion:', processingError);
                        db.run('ROLLBACK');
                        reject(processingError);
                    }
                }
            );
        });
    });
};


const getAllStock = () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT product_code,product_name,last_updated,  quantity FROM stock', [], (err, rows) => {
            if (err) {
                console.error('Database error:', err);
                reject(err);
            } else {
                console.log('Stock data fetched:', rows); // Debugging log
                resolve(rows);
            }
        });
    });
};


const deletePurchaseReturn = (purchaseReturnId) => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            try {
                // First get the purchase return details using purchasereturn_id
                db.get(
                    'SELECT productsreturn FROM purchasesreturn WHERE purchasereturn_id = ?',
                    [purchaseReturnId],
                    async (err, row) => {
                        if (err) {
                            db.run('ROLLBACK');
                            reject(err);
                            return;
                        }

                        if (!row) {
                            db.run('ROLLBACK');
                            reject(new Error('Purchase return not found'));
                            return;
                        }

                        try {
                            const productsreturn = JSON.parse(row.productsreturn);
                            console.log('Products to process:', productsreturn); // Debug log

                            // Update stock for each product
                            for (const product of productsreturn) {
                                console.log('Processing product:', product); // Debug log
                                
                                await updateStock({
                                    productCode: product.productCode,
                                    productName: product.productName,
                                    quantity: Number(product.returnquantity || 0)  // Use lowercase 'returnquantity' to match your data
                                }, 'return');  // Use 'return' transaction type which has the correct logic
                            }

                            // Delete the purchase return record using purchasereturn_id
                            db.run(
                                'DELETE FROM purchasesreturn WHERE purchasereturn_id = ?',
                                [purchaseReturnId],
                                (deleteErr) => {
                                    if (deleteErr) {
                                        console.error('Error deleting purchase return:', deleteErr);
                                        db.run('ROLLBACK');
                                        reject(deleteErr);
                                    } else {
                                        db.run('COMMIT');
                                        resolve({ success: true });
                                    }
                                }
                            );
                        } catch (parseError) {
                            console.error('Error parsing products:', parseError);
                            db.run('ROLLBACK');
                            reject(parseError);
                        }
                    }
                );
            } catch (error) {
                console.error('Transaction error:', error);
                db.run('ROLLBACK');
                reject(error);
            }
        });
    });
};



db.run(`
    CREATE TABLE IF NOT EXISTS purchasesreturn (
        purchasereturn_id INTEGER PRIMARY KEY AUTOINCREMENT,
        
        date TEXT NOT NULL,
        returnbill_no TEXT NOT NULL,
        supplier_name TEXT NOT NULL,
        
        comments TEXT,
       
        grand_total REAL NOT NULL,
         receive_amount REAL NOT NULL,
                due_amount REAL NOT NULL,
        productsreturn TEXT NOT NULL,  -- Stores JSON array of products
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
         
    )
`);

const addPurchasereturn = (purchasereturnData) => {
    return new Promise((resolve, reject) => {
        console.log('Starting purchase return transaction');
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            try {
                console.log('Converting products to JSON');
                const productsreturnJson = JSON.stringify(purchasereturnData.productsreturn);
                console.log('Products JSON length:', productsreturnJson.length);

                console.log('Inserting purchase return record');
                db.run(
                    `INSERT INTO purchasesreturn (
                        date, returnbill_no, supplier_name,
                        comments, grand_total, due_amount, receive_amount, productsreturn
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        purchasereturnData.date,
                        purchasereturnData.returnbill_no,
                        purchasereturnData.supplier_name || purchasereturnData.supplierName, // Handle both formats
                        purchasereturnData.comments,
                        purchasereturnData.grand_total,  
                        purchasereturnData.due_amount,   
                        purchasereturnData.receive_amount,
                        productsreturnJson
                    ],
                    async function(err) {
                        if (err) {
                            console.error('Error inserting purchase return:', err);
                            db.run('ROLLBACK');
                            reject(err);
                            return;
                        }
                        
                        console.log('Purchase return inserted successfully with ID:', this.lastID);
                        const purchasereturnId = this.lastID;
                        
                        try {
                            console.log('Updating stock for', purchasereturnData.productsreturn.length, 'products');
                            
                            // Create an array of promises for all stock updates
                            // Use negative quantity to REDUCE stock (since these are returns to supplier)
                            const stockUpdatePromises = purchasereturnData.productsreturn.map(productreturn => 
                                updateStock(
                                    {
                                        productId: productreturn.productId,
                                        productName: productreturn.productName,
                                        productCode: productreturn.productCode,
                                        // Use negative quantity to reduce stock
                                        returnquantity: -Math.abs(productreturn.returnquantity)
                                    }, 
                                    'sale'  // Using 'sale' type since we're reducing inventory like a sale would
                                )
                            );
                            
                            // Wait for all stock updates to complete at once
                            await Promise.all(stockUpdatePromises);
                            
                            console.log('All stock updated, committing transaction');
                            db.run('COMMIT', (commitErr) => {
                                if (commitErr) {
                                    console.error('Error committing transaction:', commitErr);
                                    db.run('ROLLBACK');
                                    reject(commitErr);
                                    return;
                                }
                                console.log('Transaction committed successfully');
                                resolve({ success: true, purchasereturnId });
                            });
                        } catch (stockErr) {
                            console.error('Error in stock update process:', stockErr);
                            db.run('ROLLBACK');
                            reject(stockErr);
                        }
                    }
                );
            } catch (error) {
                console.error('Transaction error:', error);
                db.run('ROLLBACK');
                reject(error);
            }
        });
    });
};

const getAllPurchaseReturns = () => {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT * FROM purchasesreturn ORDER BY purchasereturn_id DESC`,
            [],
            (err, rows) => {
                if (err) {
                    console.error('Database error:', err);
                    reject(err);
                    return;
                }

                try {
                    // Process each row
                // In the getAllPurchaseReturns function, update the formattedRows mapping:
const formattedRows = rows.map(row => {
    const productsreturn = JSON.parse(row.productsreturn);
    
    return {
        purchaseReturnId: row.purchasereturn_id,  // Add this line
        date: row.date,
        returnBillNo: row.returnbill_no,
        supplierName: row.supplier_name,
        comments: row.comments,
        grandTotal: Number(row.grand_total || 0),
        dueAmount: Number(row.due_amount || 0),
        receiveAmount: Number(row.receive_amount || 0),
        productsreturn: productsreturn.map(product => ({
            productCode: product.productCode,
            productName: product.productName,
            costPrice: Number(product.costPrice || 0),
            returnQuantity: Number(product.returnquantity || 0),
            totalAmount: Number(product.totalAmount || 0)
        }))
    };
});

                    console.log('Formatted purchase returns:', formattedRows); // Debug log
                    resolve(formattedRows);
                } catch (error) {
                    console.error('Error processing purchase returns:', error);
                    reject(error);
                }
            }
        );
    });
};

db.run(`
    CREATE TABLE IF NOT EXISTS sales (
       invoice_number INTEGER PRIMARY KEY AUTOINCREMENT, 
      date TEXT NOT NULL,
     
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL, 
      payment_method TEXT NOT NULL,
      transaction_type TEXT NOT NULL,
      comments TEXT,
      grand_total REAL NOT NULL,
      paid_amount REAL NOT NULL,
      due_amount REAL NOT NULL,
      
      products TEXT NOT NULL,  
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);


const updateStock = (productData, transactionType = 'purchase') => {
    return new Promise((resolve, reject) => {
        // Validate input data
        if (!productData.productCode || !productData.productName) {
            reject(new Error('Product code and name are required for stock updates'));
            return;
        }

        // Ensure quantity is a valid number
        const quantity = Number(productData.quantity || productData.returnquantity || 0);
        if (isNaN(quantity)) {
            reject(new Error('Invalid quantity value'));
            return;
        }

        db.get(
            'SELECT * FROM stock WHERE product_code = ?',
            [productData.productCode],
            (err, row) => {
                if (err) {
                    console.error('Error fetching stock:', err);
                    reject(err);
                    return;
                }

                // Calculate quantity change based on transaction type
                let quantityChange;
                if (transactionType === 'sale') {
                    quantityChange = -Math.abs(quantity);
                    
                    // Check if we have enough stock for the sale
                    if (row && row.quantity < quantity) {
                        reject(new Error(`Insufficient stock for product: ${productData.productCode}. Available: ${row.quantity}, Requested: ${quantity}`));
                        return;
                    }
                } else if (transactionType === 'return') {
                    quantityChange = Math.abs(quantity);
                } else {
                    quantityChange = quantity;
                }

                if (row) {
                    // Update existing stock
                    const newQuantity = row.quantity + quantityChange;
                    
                    // Prevent negative stock (except for initial stock entry)
                    if (newQuantity < 0 && transactionType !== 'purchase') {
                        reject(new Error(`Cannot reduce stock below 0 for product: ${productData.productCode}`));
                        return;
                    }

                    db.run(
                        `UPDATE stock 
                         SET quantity = quantity + ?,
                             ${transactionType === 'purchase' ? 'product_name = ?,' : ''} 
                             last_updated = CURRENT_TIMESTAMP 
                         WHERE product_code = ?`,
                        transactionType === 'purchase' 
                            ? [quantityChange, productData.productName, productData.productCode]
                            : [quantityChange, productData.productCode],
                        (err) => {
                            if (err) {
                                console.error('Error updating stock:', err);
                                reject(err);
                            } else {
                                console.log('Stock updated successfully:', {
                                    productCode: productData.productCode,
                                    quantityChange,
                                    transactionType,
                                    newQuantity
                                });
                                resolve({ success: true });
                            }
                        }
                    );
                } else {
                    // Only create new stock entry for purchases
                    if (transactionType === 'purchase') {
                        db.run(
                            `INSERT INTO stock (
                                product_code, 
                                product_name,
                                quantity,
                                last_updated
                            ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
                            [
                                productData.productCode,
                                productData.productName,
                                quantityChange
                            ],
                            (err) => {
                                if (err) {
                                    console.error('Error inserting new stock:', err);
                                    reject(err);
                                } else {
                                    console.log('New stock inserted successfully:', productData);
                                    resolve({ success: true });
                                }
                            }
                        );
                    } else {
                        reject(new Error(`No stock found for product code: ${productData.productCode}`));
                    }
                }
            }
        );
    });
};
const addSale = (saleData) => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            try {
                const productsJson = JSON.stringify(saleData.products);
                const customerPhone = saleData.customerPhone || saleData.customer_phone || '';
                const dueAmount = saleData.dueAmount || 0;

                // Ensure invoiceNumber for returns
                const invoiceNumber = saleData.transactionType === 'return' 
                    ? `RET-INV-${Date.now()}`
                    : saleData.invoiceNumber;

                db.run(
                    `INSERT INTO sales (
                      
                        date, 
                      
                        customer_name,
                        customer_phone,
                        payment_method, 
                        comments, 
                        grand_total, 
                        paid_amount, 
                        due_amount,
                        products, 
                        transaction_type,
                        timestamp
                    ) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                    [
                      
                        saleData.date,
                      
                        saleData.customerName,
                        customerPhone,
                        saleData.paymentMethod,
                        saleData.comments,
                        saleData.grandTotal,
                        saleData.paidAmount,
                        dueAmount,
                        productsJson,
                        saleData.transactionType || 'sale'
                    ],
                    async function(err) {
                        if (err) {
                            console.error('Error inserting sale/return:', err);
                            db.run('ROLLBACK');
                            reject(err);
                            return;
                        }
                        
                        try {
                            // Update stock for each product
                            for (const product of saleData.products) {
                                await updateStock(product, saleData.transactionType || 'sale');
                            }

                            db.run('COMMIT');
                            resolve({ success: true, saleId: this.lastID });
                        } catch (stockErr) {
                            console.error('Error updating stock:', stockErr);
                            db.run('ROLLBACK');
                            reject(stockErr);
                            return;
                        }
                    }
                );
            }catch(error) {
                console.error('Transaction error:', error);
                db.run('ROLLBACK');
                reject(error);
            }
        });
    });
};

const getSales = () => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                sale_id as id,
                date,
                customer_name,
                CAST(grand_total AS REAL) as grand_total,
                CAST(paid_amount AS REAL) as paid_amount,
                CAST(due_amount AS REAL) as due_amount,
                products
            FROM sales
            ORDER BY date DESC
        `;

        db.all(query, [], (err, rows) => {
            if (err) {
                console.error('Database error:', err);
                reject(err);
                return;
            }
            
            const formattedRows = rows.map(row => ({
                ...row,
                grand_total: parseFloat(row.grand_total || 0),
                paid_amount: parseFloat(row.paid_amount || 0),
                due_amount: parseFloat(row.due_amount || 0),
                date: new Date(row.date).toISOString()
            }));
            
            resolve(formattedRows);
        });
    });
};
  
  const getSaleById = (billNo) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM sales WHERE bill_no = ?', [billNo], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            if (row) {
                // Parse the products JSON string back to an object
                row.products = JSON.parse(row.products);
            }
            resolve(row);
        });
    });
};




// db.js
const getSupplierTransactions = (filters) => {
    return new Promise((resolve, reject) => {
        let query = `
            SELECT 
                purchase_id AS id,
                invoice_number AS invoiceNumber,
                date,
                bill_no AS billNo,
                supplier_name AS supplierName,
                payment_method AS paymentMethod,
                comments,
                tax_type AS taxType,
                tax_amount AS taxAmount,
                grand_total AS total,
                paid_amount AS paid,
                due_amount AS balance,
                products
            FROM purchases
            WHERE 1=1
        `;
        const params = [];

        if (filters.supplierName) {
            query += ' AND supplier_name = ?';
            params.push(filters.supplierName);
        }

        if (filters.fromDate) {
            query += ' AND date >= ?';
            params.push(filters.fromDate);
        }

        if (filters.toDate) {
            query += ' AND date <= ?';
            params.push(filters.toDate);
        }

        query += ' ORDER BY purchase_id DESC';

        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Error fetching supplier transactions:', err);
                reject(err);
            } else {
                try {
                    const formattedRows = rows.map(row => {
                        const products = JSON.parse(row.products);
                        return {
                            ...row,
                            products: products.map(product => ({
                                productCode: product.productCode,
                                productName: product.productName,
                                costPrice: Number(product.costPrice || 0),
                                purchasePack: Number(product.purchasePack || 0),
                                totalAmount: Number(product.totalAmount || 0)
                            }))
                        };
                    });
                    resolve(formattedRows); // Ensure this is an array
                } catch (error) {
                    console.error('Error processing supplier transactions:', error);
                    reject(error);
                }
            }
        });
    });
};
// Get transaction details by ID
const getTransactionDetailssupplier = (transactionId) => {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT * FROM purchases WHERE purchase_id = ?`,
            [transactionId],
            (err, row) => {
                if (err) {
                    console.error('Error fetching transaction details:', err);
                    reject(err);
                } else {
                    try {
                        // Parse the products JSON string
                        const products = JSON.parse(row.products);
                        resolve({
                            ...row,
                            products: products.map(product => ({
                                productCode: product.productCode,
                                productName: product.productName,
                                costPrice: Number(product.costPrice || 0),
                                purchasePack: Number(product.purchasePack || 0),
                                totalAmount: Number(product.totalAmount || 0)
                            }))
                        });
                    } catch (error) {
                        console.error('Error processing transaction details:', error);
                        reject(error);
                    }
                }
            }
        );
    });
};

// Add this to your API methods
// Modify this function in your database functions
async function checkPurchaseExists(invoiceNumber) {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT purchase_id FROM purchases WHERE purchase_id = ?',
            [invoiceNumber],
            (err, row) => {
                if (err) {
                    console.error('Database error:', err);
                    reject(err);
                } else {
                    resolve({ 
                        success: !!row, 
                        message: row ? 'Purchase found' : 'Purchase not found',
                        data: row
                    });
                }
            }
        );
    });
}
// Get purchase returns by date range and supplier
const getPurchaseReturnsByDateRange = (fromDate, toDate, supplierName = null) => {
    return new Promise((resolve, reject) => {
        let query = `SELECT * FROM purchasesreturn WHERE date BETWEEN ? AND ?`;
        const params = [fromDate, toDate];

        if (supplierName) {
            query += ` AND supplier_name = ?`;
            params.push(supplierName);
        }

        query += ` ORDER BY date DESC`;

        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Database error:', err);
                reject(err);
                return;
            }

            try {
                const formattedRows = rows.map(row => ({
                    purchaseReturnId: row.purchasereturn_id,
                    date: row.date,
                    returnBillNo: row.returnbill_no,
                    supplierName: row.supplier_name,
                    comments: row.comments,
                    grandTotal: Number(row.grand_total || 0),
                    receiveamount: Number(row.receive_amount || 0),
                    dueAmount: Number(row.due_amount || 0),
                    productsreturn: JSON.parse(row.productsreturn)
                }));

                resolve(formattedRows);
            } catch (error) {
                console.error('Error processing purchase returns:', error);
                reject(error);
            }
        });
    });
};



db.run(`
    CREATE TABLE IF NOT EXISTS salesreturn ( 
       salesreturn_id INTEGER PRIMARY KEY AUTOINCREMENT, 
         transaction_type TEXT NOT NULL,
        date TEXT NOT NULL,
        returninvoice_no TEXT NOT NULL, 
       customer_name TEXT NOT NULL, 
 customer_Phone TEXT NOT NULL, 
        
        comments TEXT,
       
        grand_total REAL NOT NULL,
       paid_amount REAL NOT NULL,
        due_amount REAL NOT NULL,
        productsreturn TEXT NOT NULL,  
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

const getAllSales = () => {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT * FROM sales ORDER BY invoice_number DESC`,
            [],
            (err, rows) => {
                if (err) {
                    console.error('Database error:', err);
                    reject(err);
                    return;
                }

                try {
                    // Process each row
                    const formattedRows = rows.map(row => {
                        // Parse the products JSON stri
                        const products = JSON.parse(row.products);

                        // Format the row data
                        return {
                            invoiceNumber: row.invoice_number,
                            date: row.date,
                            customerName: row.customer_name,
                            customerPhone: row.customer_phone,
                            paymentMethod: row.payment_method,
                            transactionType: row.transaction_type,
                            comments: row.comments,
                            grandTotal: Number(row.grand_total || 0),
                            paidAmount: Number(row.paid_amount || 0),
                            dueAmount: Number(row.due_amount || 0),
                            products: products.map(product => ({
                                productCode: product.productCode,
                                productName: product.productName,
                                rate: Number(product.rate || 0),
                                quantity: Number(product.quantity || 0),
                                unitDiscount: Number(product.unitDiscount || 0),
                                percentageDiscount: Number(product.percentageDiscount || 0),
                                total: Number(product.total || 0)
                            }))
                        };
                    });

                    console.log('Formatted sales data:', formattedRows); // Debug log
                    resolve(formattedRows);
                } catch (error) {
                    console.error('Error processing sales data:', error);
                    reject(error);
                }
            }
        );
    });
};


const addSalesReturn = (salesReturnData) => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            try {
                // Convert products array to JSON string
                const productsReturnJson = JSON.stringify(salesReturnData.productsReturn);

                // Insert sales return record with transaction_type set to "Return"
                db.run(
                    `INSERT INTO salesreturn (
                        transaction_type, date, returninvoice_no, 
                        customer_name, customer_Phone, comments, 
                        grand_total, paid_amount, due_amount, productsreturn
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        "Return",  // Automatically set transaction type
                        salesReturnData.date,
                        salesReturnData.returnInvoiceNo,
                        salesReturnData.customerName,
                        salesReturnData.customerPhone,
                        salesReturnData.comments,
                        salesReturnData.grandTotal,
                        salesReturnData.paidAmount,
                        salesReturnData.dueAmount,
                        productsReturnJson
                    ],
                    async function(err) {
                        if (err) {
                            console.error('Error inserting sales return:', err);
                            throw err;
                        }

                        const salesReturnId = this.lastID;

                        // Update stock for each returned product (increase stock)
                        for (const productReturn of salesReturnData.productsReturn) {
                            try {
                                // Positive quantity to increase stock
                                await updateStock({
                                    productName: productReturn.productName,
                                    productCode: productReturn.productCode,
                                    quantity: productReturn.returnQuantity  // Increase stock
                                });
                            } catch (stockErr) {
                                console.error('Error updating stock:', stockErr);
                                throw stockErr;
                            }
                        }

                        db.run('COMMIT');
                        resolve({ success: true, salesReturnId });
                    }
                );
            } catch (error) {
                console.error('Transaction error:', error);
                db.run('ROLLBACK');
                reject(error);
            }
        });
    });
};



const getAllSalesReturns = () => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                salesreturn_id,
                transaction_type,
                date,
                returninvoice_no,
                customer_name,
                customer_Phone as customerPhone,
                comments,
                grand_total,
                paid_amount,
                due_amount,
                productsreturn
            FROM salesreturn 
            ORDER BY date DESC, returninvoice_no DESC
        `;

        db.all(query, [], (err, rows) => {
            if (err) {
                console.error('Error fetching sales returns:', err);
                reject({success: false, message: 'Failed to fetch sales returns'});
                return;
            }

            try {
                const formattedReturns = rows.map(row => {
                    let productsReturn = [];
                    try {
                        productsReturn = JSON.parse(row.productsreturn);
                    } catch (e) {
                        console.error('Error parsing products JSON:', e);
                        productsReturn = [];
                    }
                    
                    return {
                        salesReturnId: row.salesreturn_id,
                        returnBillNo: row.returninvoice_no,
                        date: row.date,
                        customerName: row.customer_name,
                        customerPhone: row.customerPhone,
                        comments: row.comments || '',
                        grandTotal: Number(row.grand_total || 0),
                        paidAmount: Number(row.paid_amount || 0), // Added paid amount
                        dueAmount: Number(row.due_amount || 0),
                        productsreturn: productsReturn.map(product => ({
                            productCode: product.productCode,
                            productName: product.productName,
                            salePrice: Number(product.salePrice || 0),
                            returnQuantity: Number(product.returnQuantity || 0),
                            totalAmount: Number(product.totalAmount || 0)
                        }))
                    };
                });

                console.log('Formatted returns data:', formattedReturns);
                resolve(formattedReturns);
            } catch (error) {
                console.error('Error processing sales returns:', error);
                reject({success: false, message: 'Error processing sales returns data'});
            }
        });
    });
};
// db.js

const getSalesReturnsByDateRange = (fromDate, toDate, customerName = null) => {
    return new Promise((resolve, reject) => {
        let query = `
            SELECT * FROM salesreturn 
            WHERE date BETWEEN ? AND ?`;
        const params = [fromDate, toDate];

        if (customerName) {
            query += ` AND customer_name = ?`;
            params.push(customerName);
        }

        query += ` ORDER BY date DESC`;

        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Database error:', err);
                reject(err);
                return;
            }

            try {
                const formattedRows = rows.map(row => ({
                    salesReturnId: row.salesreturn_id,
                    transactionType: row.transaction_type,
                    date: row.date,
                    returnInvoiceNo: row.returninvoice_no,
                    customerName: row.customer_name,
                    customerPhone: row.customer_Phone,
                    comments: row.comments,
                    grandTotal: Number(row.grand_total || 0),
                    paidAmount: Number(row.paid_amount || 0),
                    dueAmount: Number(row.due_amount || 0),
                    productsreturn: JSON.parse(row.productsreturn)
                }));

                resolve(formattedRows);
            } catch (error) {
                console.error('Error processing sales returns:', error);
                reject(error);
            }
        });
    });
};

// Function to get customer transactions including both sales and returns
const getCustomerTransactions = (params) => {
    return new Promise(async (resolve, reject) => {
        try {
            // Get regular sales
            const salesQuery = `
                SELECT 
                    rowid,
                    'Sale' as transaction_type,
                    invoice_number,
                    date,
                    customer_name,
                    payment_method,
                    grand_total as total,
                    paid_amount as paid,
                    due_amount as balance,
                    products,
                    json_array_length(products) as item_count
                FROM sales
                WHERE DATE(date) BETWEEN DATE(?) AND DATE(?)
                ${params.customerName ? 'AND customer_name LIKE ?' : ''}
            `;

            // Get sales returns
            const returnsQuery = `
                SELECT 
                    salesreturn_id as rowid,
                    transaction_type,
                    returninvoice_no as invoice_number,
                    date,
                    customer_name,
                    'Return' as payment_method,
                    grand_total as total,
                    paid_amount as paid,
                    due_amount as balance,
                    productsreturn as products,
                    json_array_length(productsreturn) as item_count
                FROM salesreturn
                WHERE DATE(date) BETWEEN DATE(?) AND DATE(?)
                ${params.customerName ? 'AND customer_name LIKE ?' : ''}
            `;

            const queryParams = params.customerName 
                ? [params.fromDate, params.toDate, `%${params.customerName}%`]
                : [params.fromDate, params.toDate];

            // Execute both queries
            const [salesRows, returnsRows] = await Promise.all([
                new Promise((resolve, reject) => {
                    db.all(salesQuery, queryParams, (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                }),
                new Promise((resolve, reject) => {
                    db.all(returnsQuery, queryParams, (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                })
            ]);

            // Process and combine results
            const transactions = [...salesRows, ...returnsRows].map(row => ({
                id: row.rowid,
                invoiceNumber: row.invoice_number,
                date: row.date,
                customerName: row.customer_name,
                paymentMethod: row.payment_method,
                transactionType: row.transaction_type,
                total: Number(row.total || 0),
                paid: Number(row.paid || 0),
                balance: Number(row.balance || 0),
                itemCount: row.item_count,
                products: JSON.parse(row.products)
            }));

            // Sort combined results by date descending
            transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

            resolve(transactions);

        } catch (error) {
            console.error('Error fetching customer transactions:', error);
            reject(error);
        }
    });
};

// Function to get detailed transaction information for both sales and returns
const getTransactionDetails = (transactionId, transactionType) => {
    return new Promise((resolve, reject) => {
        let query;
        
        if (transactionType.toLowerCase() === 'sale') {
            query = `
                SELECT 
                    rowid,
                    'Sale' as transaction_type,
                    invoice_number,
                    date,
                    customer_name,
                    payment_method,
                    grand_total,
                    paid_amount,
                    due_amount as balance,
                    products,
                    comments
                FROM sales
                WHERE rowid = ?
            `;
        } else {
            query = `
                SELECT 
                    salesreturn_id as rowid,
                    transaction_type,
                    returninvoice_no as invoice_number,
                    date,
                    customer_name,
                    'Return' as payment_method,
                    grand_total,
                    paid_amount,
                    due_amount as balance,
                    productsreturn as products,
                    comments
                FROM salesreturn
                WHERE salesreturn_id = ?
            `;
        }

        db.get(query, [transactionId], (err, row) => {
            if (err) {
                console.error('Error fetching transaction details:', err);
                reject(err);
                return;
            }

            if (!row) {
                reject(new Error('Transaction not found'));
                return;
            }

            // Calculate payment status
            const paymentStatus = row.paid_amount >= row.grand_total ? 'Paid' :
                                row.paid_amount > 0 ? 'Partial' : 'Unpaid';

            // Format the response
            const transaction = {
                id: row.rowid,
                invoiceNumber: row.invoice_number,
                date: row.date,
                customerName: row.customer_name,
                paymentMethod: row.payment_method,
                transactionType: row.transaction_type,
                paymentStatus: paymentStatus,
                products: JSON.parse(row.products),
                subTotal: row.grand_total,
                discount: 0, // Set to 0 if not in database
                adjustment: 0, // Set to 0 if not in database
                total: row.grand_total,
                paid: row.paid_amount,
                balance: row.balance,
                comments: row.comments || ''
            };

            resolve(transaction);
        });
    });
};


// Function to retrieve daily sales data
const getDailySalesData = (params) => {
    return new Promise((resolve, reject) => {
        const { fromDate, toDate, paymentMethod, transactionType } = params;
        
        // Query for both sales and returns
        const salesQuery = `
            SELECT 
                s.invoice_number,
                s.date,
                s.customer_name,
                s.payment_method,
                s.grand_total as total,
                s.paid_amount,
                s.due_amount,
                s.transaction_type,
                json_array_length(s.products) as item_count,
                strftime('%H:%M', s.date) as time
            FROM sales s
            WHERE date(s.date) BETWEEN date(?) AND date(?)
            ${paymentMethod ? ' AND s.payment_method = ?' : ''}
            ${transactionType ? ' AND s.transaction_type = ?' : ''}
        `;

        const returnsQuery = `
            SELECT 
                sr.salesreturn_id as invoice_number,
                sr.date,
                sr.customer_name,
                'Return' as transaction_type,
                sr.grand_total as total,
                sr.paid_amount,
                sr.due_amount,
                json_array_length(sr.productsreturn) as item_count,
                strftime('%H:%M', sr.date) as time
            FROM salesreturn sr
            WHERE date(sr.date) BETWEEN date(?) AND date(?)
        `;

        // Parameters for both queries
        const salesParams = [fromDate, toDate];
        if (paymentMethod) salesParams.push(paymentMethod);
        if (transactionType) salesParams.push(transactionType.toLowerCase());
        
        const returnsParams = [fromDate, toDate];

        // Execute both queries
        Promise.all([
            new Promise((resolve, reject) => {
                db.all(salesQuery, salesParams, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            }),
            new Promise((resolve, reject) => {
                db.all(returnsQuery, returnsParams, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            })
        ])
        .then(([salesRows, returnsRows]) => {
            // Combine and format all rows
            const allRows = [
                ...salesRows.map(row => ({
                    date: new Date(row.date).toISOString(),
                    invoiceNumber: row.invoice_number,
                    customerName: row.customer_name,
                    transactionType: row.transaction_type.charAt(0).toUpperCase() + row.transaction_type.slice(1),
                    paymentMethod: row.payment_method,
                    paidAmount: row.paid_amount, // Use consistent naming
                    dueAmount: row.due_amount, 
                    itemCount: row.item_count,
                    total: row.total,
                    time: row.time
                })),
                ...returnsRows.map(row => ({
                    date: new Date(row.date).toISOString(),
                    invoiceNumber: row.invoice_number,
                    customerName: row.customer_name,
                    transactionType: 'Return',
                    paymentMethod: 'Return',
                    paidAmount: row.paid_amount, // Use consistent naming
                    dueAmount: row.due_amount,   // Use consistent naming
                    itemCount: row.item_count,
                    total: -Math.abs(row.total), // Make returns negative
                    time: row.time
                }))
            ];

            // Sort combined results by date
            allRows.sort((a, b) => new Date(a.date) - new Date(b.date));
            resolve(allRows);
        })
        .catch(error => {
            console.error('Error retrieving daily sales and returns data:', error);
            reject(error);
        });
    });
};
// Add this to db.js
const getProductDetails = (invoiceNumber, transactionType) => {
    return new Promise((resolve, reject) => {
        let query, params;
        
        if (transactionType.toLowerCase() === 'return') {
            query = `
                SELECT sr.productsreturn
                FROM salesreturn sr
                WHERE sr.salesreturn_id = ?  
            `;
            params = [invoiceNumber];
        }else {
            query = `
                SELECT s.products
                FROM sales s
                WHERE s.invoice_number = ?
            `;
            params = [invoiceNumber];
        }
        
        db.get(query, params, (err, row) => {
            if (err) {
                console.error('Database error:', err);
                reject(err);
                return;
            }
            
            if (!row) {
                reject(new Error('Transaction not found'));
                return;
            }
            
            try {
                // Parse the JSON array of products
                const productsJson = transactionType.toLowerCase() === 'return' 
                    ? row.productsreturn 
                    : row.products;
                
                const products = JSON.parse(productsJson);
                resolve(products);
            } catch (e) {
                console.error('Error parsing product data:', e);
                reject(e);
            }
        });
    });
};



const formatDateParam = (dateStr) => {
    // If it's YYYY-MM format, add day
    if (/^\d{4}-\d{2}$/.test(dateStr)) {
        return `${dateStr}-01`;
    }
    return dateStr;
};

// Function to get last day of month
const getLastDayOfMonth = (dateStr) => {
    const date = new Date(dateStr + '-01');
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    return `${dateStr}-${lastDay}`;
};
const getMonthlySalesData = (params) => {
    return new Promise(async (resolve, reject) => {
        const { fromDate, toDate, paymentMethod, transactionType } = params;
        
        // Format dates properly
        const startDate = formatDateParam(fromDate);
        const endDate = /^\d{4}-\d{2}$/.test(toDate) ? 
            getLastDayOfMonth(toDate) : 
            formatDateParam(toDate);

        console.log('Monthly Query Dates:', { startDate, endDate });
        
        try {
            // First query for regular sales data
            const salesQuery = `
                SELECT 
                    strftime('%Y-%m', s.date) as month,
                    COUNT(s.invoice_number) as totalTransactions,
                    SUM(CASE WHEN s.transaction_type = 'sale' THEN 1 ELSE 0 END) as salesCount,
                    ROUND(SUM(CASE WHEN s.transaction_type = 'sale' THEN s.grand_total ELSE 0 END), 2) as salesAmount
                FROM sales s
                WHERE date(s.date) BETWEEN date(?) AND date(?)
                ${paymentMethod ? ' AND s.payment_method = ?' : ''}
                ${transactionType ? ' AND s.transaction_type = ?' : ''}
                GROUP BY strftime('%Y-%m', s.date)
            `;
            
            const salesParams = [startDate, endDate];
            if (paymentMethod) salesParams.push(paymentMethod);
            if (transactionType) salesParams.push(transactionType.toLowerCase());

            // Second query for returns data from salesreturn table
            const returnsQuery = `
                SELECT 
                    strftime('%Y-%m', sr.date) as month,
                    COUNT(sr.salesreturn_id) as returnCount,
                    ROUND(SUM(sr.grand_total), 2) as returnsAmount
                FROM salesreturn sr
                WHERE date(sr.date) BETWEEN date(?) AND date(?)
                GROUP BY strftime('%Y-%m', sr.date)
            `;
            
            const returnsParams = [startDate, endDate];

            // Execute both queries using Promise.all
            const [salesRows, returnsRows] = await Promise.all([
                new Promise((resolve, reject) => {
                    db.all(salesQuery, salesParams, (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                }),
                new Promise((resolve, reject) => {
                    db.all(returnsQuery, returnsParams, (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                })
            ]);

            // Create a map to combine sales and returns data
            const monthlyData = new Map();

            // Process sales data
            salesRows.forEach(row => {
                monthlyData.set(row.month, {
                    date: row.month + '-01',
                    totalTransactions: parseInt(row.totalTransactions) || 0,
                    salesCount: parseInt(row.salesCount) || 0,
                    returnCount: 0,
                    salesAmount: parseFloat(row.salesAmount) || 0,
                    returnsAmount: 0,
                    netAmount: parseFloat(row.salesAmount) || 0
                });
            });

            // Process and combine returns data
            returnsRows.forEach(row => {
                if (monthlyData.has(row.month)) {
                    // Update existing month data
                    const monthData = monthlyData.get(row.month);
                    monthData.returnCount = parseInt(row.returnCount) || 0;
                    monthData.returnsAmount = parseFloat(row.returnsAmount) || 0;
                    monthData.totalTransactions += parseInt(row.returnCount) || 0;
                    monthData.netAmount = monthData.salesAmount - monthData.returnsAmount;
                } else {
                    // Create new month entry if it doesn't exist
                    monthlyData.set(row.month, {
                        date: row.month + '-01',
                        totalTransactions: parseInt(row.returnCount) || 0,
                        salesCount: 0,
                        returnCount: parseInt(row.returnCount) || 0,
                        salesAmount: 0,
                        returnsAmount: parseFloat(row.returnsAmount) || 0,
                        netAmount: -parseFloat(row.returnsAmount) || 0
                    });
                }
            });

            // Convert map to array and sort by date
            const formattedRows = Array.from(monthlyData.values())
                .sort((a, b) => a.date.localeCompare(b.date));

            console.log(`Combined monthly results found: ${formattedRows.length}`);
            resolve(formattedRows);

        } catch (error) {
            console.error('Error retrieving combined monthly data:', error);
            reject(error);
        }
    });
};
const getMonthlyTransactionDetails = (params) => {
    return new Promise((resolve, reject) => {
        const { year, month } = params;
        const yearMonth = `${year}-${month}`;
        
        // Query for sales transactions
        const salesQuery = `
            SELECT 
               
                s.invoice_number,
                s.date,
                s.customer_name,
                s.payment_method,
                s.grand_total as total,
                'Sale' as transaction_type,
                s.products as raw_products,
                json_array_length(s.products) as item_count,
                strftime('%H:%M', s.date) as time
            FROM sales s
            WHERE strftime('%Y-%m', s.date) = ?
        `;

        // Query for return transactions
        const returnsQuery = `
            SELECT 
                sr.salesreturn_id as id,
                sr.returninvoice_no as invoice_number,
                sr.date,
                sr.customer_name,
                'Return' as transaction_type,
                sr.grand_total as total,
                sr.productsreturn as raw_products,
                json_array_length(sr.productsreturn) as item_count,
                strftime('%H:%M', sr.date) as time
            FROM salesreturn sr
            WHERE strftime('%Y-%m', sr.date) = ?
        `;

        Promise.all([
            new Promise((resolve, reject) => {
                db.all(salesQuery, [yearMonth], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            }),
            new Promise((resolve, reject) => {
                db.all(returnsQuery, [yearMonth], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            })
        ])
        .then(([salesRows, returnsRows]) => {
            // Process sales transactions
            const salesTransactions = salesRows.map(row => ({
          
                invoiceNumber: row.invoice_number,
                date: row.date,
                time: row.time,
                customerName: row.customer_name,
                paymentMethod: row.payment_method || 'N/A',
                total: parseFloat(row.total),
                transactionType: row.transaction_type,
                itemCount: row.item_count,
                products: JSON.parse(row.raw_products)
            }));

            // Process return transactions
            const returnTransactions = returnsRows.map(row => ({
                id: row.id,
                invoiceNumber: row.invoice_number,
                date: row.date,
                time: row.time,
                customerName: row.customer_name,
                paymentMethod: 'N/A', // or handle if you store payment method for returns
                total: parseFloat(row.total),
                transactionType: row.transaction_type,
                itemCount: row.item_count,
                products: JSON.parse(row.raw_products)
            }));

            // Combine and sort all transactions by date and time
            const allTransactions = [...salesTransactions, ...returnTransactions]
                .sort((a, b) => {
                    const dateTimeA = new Date(a.date + ' ' + a.time);
                    const dateTimeB = new Date(b.date + ' ' + b.time);
                    return dateTimeA - dateTimeB;
                });

            // Calculate monthly totals
            const monthlyTotals = allTransactions.reduce((totals, transaction) => {
                if (transaction.transactionType === 'Sale') {
                    totals.salesCount++;
                    totals.salesAmount += transaction.total;
                } else {
                    totals.returnCount++;
                    totals.returnsAmount += transaction.total;
                }
                totals.totalTransactions++;
                totals.totalItems += transaction.itemCount;
                return totals;
            }, {
                totalTransactions: 0,
                salesCount: 0,
                returnCount: 0,
                salesAmount: 0,
                returnsAmount: 0,
                totalItems: 0
            });

            monthlyTotals.netAmount = monthlyTotals.salesAmount - monthlyTotals.returnsAmount;

            resolve({
                transactions: allTransactions,
                ...monthlyTotals
            });

        })
        .catch(error => {
            console.error('Error retrieving transaction details:', error);
            reject(error);
        });
    });
};

db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
        expense_id INTEGER PRIMARY KEY AUTOINCREMENT,
        expense_name TEXT NOT NULL,
        expense_description TEXT NOT NULL,
        expense_amount REAL NOT NULL,
        expense_date TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`, (err) => {
    if (err) {
        console.error("Error creating expenses table:", err.message);
    } else {
        console.log("Expenses table created or already exists");
    }
});

// Add a new expense to the database
const addExpense = (expense) => {
    // Debug log to see what the database function receives
    console.log('Database received expense object:', expense);
    
    return new Promise((resolve, reject) => {
        // Destructure with defaults to prevent null errors
        const expenseName = expense.expenseName;
        const expenseDescription = expense.expenseDescription;
        const expenseAmount = expense.expenseAmount;
        const expenseDate = expense.expenseDate;
        
        console.log('Processing expense values:', {
            expenseName,
            expenseDescription,
            expenseAmount,
            expenseDate
        });

        // Validate before attempting to insert
        if (!expenseName) {
            console.error("Missing expense name");
            return reject(new Error('Expense name is required'));
        }
        
        const query = `INSERT INTO expenses (expense_name, expense_description, expense_amount, expense_date) 
                      VALUES (?, ?, ?, ?)`;
        
        db.run(query, [expenseName, expenseDescription, expenseAmount, expenseDate], function(err) {
            if (err) {
                console.error("Error adding expense:", err);
                reject(err);
            } else {
                resolve({ success: true, expenseId: this.lastID });
            }
        });
    });
};

// Get all expenses from the database
const getExpenses = () => {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM expenses ORDER BY expense_date DESC`;
        db.all(query, [], (err, rows) => {
            if (err) {
                console.error("Error fetching expenses:", err.message);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

// Update expense in the database
const updateExpense = (expense) => {
    return new Promise((resolve, reject) => {
        const { expense_id, expenseName, expenseDescription, expenseAmount, expenseDate } = expense;
        const query = `UPDATE expenses SET 
                      expense_name = ?, 
                      expense_description = ?, 
                      expense_amount = ?, 
                      expense_date = ? 
                      WHERE expense_id = ?`;
        db.run(query, [expenseName, expenseDescription, expenseAmount, expenseDate, expense_id], function (err) {
            if (err) {
                console.error("Error updating expense:", err.message);
                reject(err);
            } else {
                resolve({ success: true, affectedRows: this.changes }); // Return number of affected rows
            }
        });
    });
};

// Delete expense from the database
const deleteExpense = (expenseId) => {
    return new Promise((resolve, reject) => {
        const query = `DELETE FROM expenses WHERE expense_id = ?`;
        db.run(query, [expenseId], function (err) {
            if (err) {
                console.error("Error deleting expense:", err.message);
                reject(err);
            } else {
                resolve({ success: true, changes: this.changes }); // Return how many rows were affected
            }
        });
    });
};
function updatePurchasePayment(invoiceNumber, paidAmount, dueAmount, newPayment) {
    return new Promise((resolve, reject) => {
        // Begin transaction
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            // Update the purchase record
            db.run(
                `UPDATE purchases 
                 SET paid_amount = ?, due_amount = ? 
                 WHERE invoice_number = ?`,
                [paidAmount, dueAmount, invoiceNumber],
                function(err) {
                    if (err) {
                        db.run('ROLLBACK');
                        reject(err);
                        return;
                    }
                    
                    if (this.changes === 0) {
                        db.run('ROLLBACK');
                        reject(new Error('Purchase not found'));
                        return;
                    }
                    
                    // Add entry to payment history
                    db.run(
                        `INSERT INTO payment_history 
                         (invoice_number, payment_date, payment_amount, notes) 
                         VALUES (?, ?, ?, ?)`,
                        [
                            invoiceNumber, 
                            new Date().toISOString(), 
                            newPayment,
                            'Payment update'
                        ],
                        function(err) {
                            if (err) {
                                db.run('ROLLBACK');
                                reject(err);
                                return;
                            }
                            
                            // Commit the transaction
                            db.run('COMMIT', (err) => {
                                if (err) {
                                    db.run('ROLLBACK');
                                    reject(err);
                                    return;
                                }
                                
                                resolve({ success: true });
                            });
                        }
                    );
                }
            );
        });
    });
}
db.run(`
    CREATE TABLE IF NOT EXISTS payment_history (
        payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT NOT NULL,
        payment_date TEXT NOT NULL,
        payment_amount REAL NOT NULL,
        notes TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);
const getPaymentHistory = (invoiceNumber) => {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT 
                payment_id, 
                invoice_number, 
                payment_date, 
                payment_amount, 
                notes, 
                timestamp 
            FROM payment_history 
            WHERE invoice_number = ? 
            ORDER BY payment_date DESC, timestamp DESC`,
            [invoiceNumber],
            (err, rows) => {
                if (err) {
                    console.error('Database error:', err);
                    reject(err);
                    return;
                }
                
                try {
                    const paymentHistory = rows.map(row => ({
                        paymentId: row.payment_id,
                        invoiceNumber: row.invoice_number,
                        paymentDate: row.payment_date,
                        paymentAmount: Number(row.payment_amount || 0),
                        notes: row.notes || '',
                        timestamp: row.timestamp
                    }));
                    
                    resolve(paymentHistory);
                } catch (error) {
                    console.error('Error processing payment history:', error);
                    reject(error);
                }
            }
        );
    });
};


// Initialize database tables
function initializeDatabase() {
    db.run(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Error creating settings table:', err);
        } else {
            console.log('Settings table created or already exists');
            
            // Initialize the last_barcode setting if it doesn't exist
            db.get("SELECT 1 FROM settings WHERE key = 'last_barcode'", (err, row) => {
                if (err) {
                    console.error('Error checking last_barcode setting:', err);
                    return;
                }
                
                if (!row) {
                    // Insert default value
                    db.run("INSERT INTO settings (key, value) VALUES ('last_barcode', 'A000001')", (err) => {
                        if (err) {
                            console.error('Error initializing last_barcode setting:', err);
                        } else {
                            console.log('Initialized last_barcode setting with default value');
                        }
                    });
                }
            });
        }
    });
    // Create backup_logs table if needed
    db.run(`
        CREATE TABLE IF NOT EXISTS backup_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            backup_path TEXT NOT NULL,
            backup_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            backup_size INTEGER,
            status TEXT DEFAULT 'success'
        )
    `, (err) => {
        if (err) {
            console.error('Error creating backup_logs table:', err);
        } else {
            console.log('Backup logs table created or already exists');
        }
    });
}

// This is the corrected logBackup function
const logBackup = (backupPath, backupSize, status = 'success', type = 'manual') => {
    return new Promise((resolve, reject) => {
      // First check if we need to modify the table structure to add the type column
      db.all("PRAGMA table_info(backup_logs)", [], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Check if we need to add the type column
        const typeColumnExists = rows.some(row => row.name === 'type');
        
        if (!typeColumnExists) {
          // Add the type column to the table
          db.run("ALTER TABLE backup_logs ADD COLUMN type TEXT DEFAULT 'manual'", (alterErr) => {
            if (alterErr) {
              console.error("Error adding type column:", alterErr);
              // Continue anyway, just won't have type information
            }
            
            // Insert the backup record
            insertBackupRecord();
          });
        } else {
          // Type column already exists, just insert the record
          insertBackupRecord();
        }
      });
      
      function insertBackupRecord() {
        db.run(
          `INSERT INTO backup_logs (backup_path, backup_size, status, type) VALUES (?, ?, ?, ?)`,
          [backupPath, backupSize, status, type],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      }
    });
  };
  
  // Update the getBackupHistory function to accept a limit parameter
  const getBackupHistory = (limit = 10) => {
    return new Promise((resolve, reject) => {
      // First check if type column exists
      db.all("PRAGMA table_info(backup_logs)", [], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Determine if type column exists
        const typeColumnExists = rows.some(row => row.name === 'type');
        
        let query;
        if (typeColumnExists) {
          query = `SELECT id, backup_path, backup_time, backup_size, status, type FROM backup_logs ORDER BY backup_time DESC LIMIT ?`;
        } else {
          query = `SELECT id, backup_path, backup_time, backup_size, status FROM backup_logs ORDER BY backup_time DESC LIMIT ?`;
        }
        
        db.all(
          query,
          [limit],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });
    });
  };
  

// Get the database file path
const getDatabasePath = () => {
    return dbPath;
};
// Add these functions to your db.js file

// Clear the backup history
const clearBackupHistory = () => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM backup_logs', function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ rowsDeleted: this.changes });
        }
      });
    });
  };
  
  // Close the database connection
  const close = () => {
    return new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  };
  
  // Open the database connection
  const open = () => {
    return new Promise((resolve, reject) => {
      // Reopen the database connection
      db = new sqlite3.Database(dbPath, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  };
  
 function updatePurchaseReturnPayment(purchaseReturnId, returnBillNo, paidAmount, dueAmount, newPayment, notes = 'Payment update') {
    return new Promise((resolve, reject) => {
        console.log('DB Update - purchaseReturnId:', purchaseReturnId, 'Type:', typeof purchaseReturnId);
        
        // Always convert to number for database operations
        const idValue = parseInt(purchaseReturnId, 10);
        
        if (isNaN(idValue)) {
            reject(new Error(`Invalid purchase return ID: ${purchaseReturnId}`));
            return;
        }
        
        // Begin transaction
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            // Use the numeric ID value consistently
            db.run(
                `UPDATE purchasesreturn 
                 SET receive_amount = ?, due_amount = ? 
                 WHERE purchasereturn_id = ?`,
                [paidAmount, dueAmount, idValue],
                function(err) {
                    if (err) {
                        console.error('DB update error:', err);
                        db.run('ROLLBACK');
                        reject(err);
                        return;
                    }
                    
                    if (this.changes === 0) {
                        console.error('No record found for ID:', idValue);
                        db.run('ROLLBACK');
                        reject(new Error(`Purchase return not found for ID: ${idValue}`));
                        return;
                    }
                    
                    // Store the purchasereturn_id in the invoice_number column
                    db.run(
                        `INSERT INTO purchasereturnpayment_history 
                         (invoice_number, payment_date, receive_amount, notes) 
                         VALUES (?, ?, ?, ?)`,
                        [
                            idValue, // Store the numeric purchasereturn_id
                            new Date().toISOString(), 
                            newPayment,
                            notes
                        ],
                        function(err) {
                            if (err) {
                                console.error('Payment history insert error:', err);
                                db.run('ROLLBACK');
                                reject(err);
                                return;
                            }
                            
                            // Commit the transaction
                            db.run('COMMIT', (err) => {
                                if (err) {
                                    db.run('ROLLBACK');
                                    reject(err);
                                    return;
                                }
                                
                                resolve({ success: true });
                            });
                        }
                    );
                }
            );
        });
    });
}
const getPurchaseReturnPaymentHistory = (purchasereturn_id) => {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT 
                payment_id,
                invoice_number,
                payment_date,
                receive_amount,
                notes,
                timestamp
            FROM purchasereturnpayment_history
            WHERE invoice_number = ?
            ORDER BY payment_date DESC, timestamp DESC`,
            [purchasereturn_id],
            (err, rows) => {
                if (err) {
                    console.error('Database error:', err);
                    reject(err);
                    return;
                }
                
                try {
                    const paymentHistory = rows.map(row => ({
                        paymentId: row.payment_id,
                        returnBillNo: row.invoice_number,
                        paymentDate: row.payment_date,
                        paymentAmount: Number(row.receive_amount || 0),
                        notes: row.notes || '',
                        timestamp: row.timestamp
                    }));
                    
                    resolve(paymentHistory);
                } catch (error) {
                    console.error('Error processing payment history:', error);
                    reject(error);
                }
            }
        );
    });
};
db.run(`
    CREATE TABLE IF NOT EXISTS purchasereturnpayment_history (
        payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT NOT NULL,
        payment_date TEXT NOT NULL,
        receive_amount REAL NOT NULL,
        notes TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);
const deleteSale = (invoiceNumber) => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            try {
                // First get the sale details to know what stock to update
                db.get(
                    'SELECT products FROM sales WHERE invoice_number = ?',
                    [invoiceNumber],
                    async (err, saleRow) => {
                        if (err) {
                            db.run('ROLLBACK');
                            reject(err);
                            return;
                        }
                        if (!saleRow) {
                            db.run('ROLLBACK');
                            reject(new Error('Sale not found'));
                            return;
                        }

                        try {
                            const saleProducts = JSON.parse(saleRow.products);
                            console.log(`[DELETE SALE] Adding back ${saleProducts.length} products from sale #${invoiceNumber} to stock`);
                            
                            // Update stock for each product (add back to stock)
                            // When a sale is deleted, the products sold should go back to inventory
                            for (const product of saleProducts) {
                                // Make sure quantity is a valid number
                                const quantity = parseInt(product.quantity) || 0;
                                if (quantity <= 0) continue; // Skip if quantity is invalid
                                
                                console.log(`[DELETE SALE] Adding back ${quantity} of ${product.productCode} to stock`);
                                
                                await new Promise((resolve, reject) => {
                                    // First check if the product exists in stock
                                    db.get(
                                        'SELECT quantity FROM stock WHERE product_code = ?',
                                        [product.productCode],
                                        (err, stockRow) => {
                                            if (err) {
                                                reject(err);
                                                return;
                                            }
                                            
                                            if (!stockRow) {
                                                // Product doesn't exist in stock, create it
                                                db.run(
                                                    `INSERT INTO stock 
                                                    (product_code, product_name, quantity, last_updated) 
                                                    VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
                                                    [product.productCode, product.productName, quantity],
                                                    (err) => {
                                                        if (err) reject(err);
                                                        else resolve();
                                                    }
                                                );
                                            } else {
                                                // Product exists, update it
                                                const newQuantity = (stockRow.quantity || 0) + quantity;
                                                db.run(
                                                    `UPDATE stock 
                                                    SET quantity = ?,
                                                        last_updated = CURRENT_TIMESTAMP 
                                                    WHERE product_code = ?`,
                                                    [newQuantity, product.productCode],
                                                    (err) => {
                                                        if (err) reject(err);
                                                        else resolve();
                                                    }
                                                );
                                            }
                                        }
                                    );
                                });
                            }

                            // Get related salesreturn records
                            const returnRowsPromise = new Promise((resolve, reject) => {
                                db.all(
                                    'SELECT salesreturn_id, productsreturn FROM salesreturn WHERE returninvoice_no = ?',
                                    [invoiceNumber],
                                    (err, rows) => {
                                        if (err) reject(err);
                                        else resolve(rows || []);
                                    }
                                );
                            });

                            const returnRows = await returnRowsPromise;
                            console.log(`[DELETE SALE] Found ${returnRows.length} salesreturn records for invoice #${invoiceNumber}`);
                            
                            // Process salesreturn records if they exist
                            if (returnRows.length > 0) {
                                for (const returnRow of returnRows) {
                                    try {
                                        const returnProducts = JSON.parse(returnRow.productsreturn);
                                        console.log(`[DELETE SALE] Processing salesreturn ID ${returnRow.salesreturn_id} with ${returnProducts.length} products`);
                                        console.log('[DELETE SALE] Return products data:', JSON.stringify(returnProducts));
                                        
                                        // Process each returned product one by one
                                        for (const product of returnProducts) {
                                            console.log(`[DELETE SALE] Processing return product: ${product.productCode} with data:`, JSON.stringify(product));
                                            
                                            // Check all possible property names for quantity
                                            // Different property names might be used for quantity in the return data
                                            const quantity = parseInt(
                                                product.returnQuantity || 
                                                product.return_quantity || 
                                                product.quantityReturned || 
                                                product.quantity_returned || 
                                                product.quantity
                                            ) || 0;
                                            
                                            console.log(`[DELETE SALE] Return product ${product.productCode} resolved quantity: ${quantity}`);
                                            
                                            if (quantity <= 0) {
                                                console.log(`[DELETE SALE] Skipping product with invalid quantity: ${product.productCode}`);
                                                continue; // Skip if quantity is invalid
                                            }
                                            
                                            console.log(`[DELETE SALE] Subtracting ${quantity} of ${product.productCode} from stock (returned item)`);
                                            
                                            // Define the stock update as a promise
                                            const updateStockPromise = new Promise((resolve, reject) => {
                                                db.get(
                                                    'SELECT quantity FROM stock WHERE product_code = ?',
                                                    [product.productCode],
                                                    (err, stockRow) => {
                                                        if (err) {
                                                            console.error(`[DELETE SALE] Database error checking stock: ${err.message}`);
                                                            reject(err);
                                                            return;
                                                        }
                                                        
                                                        if (!stockRow) {
                                                            // Product doesn't exist in stock
                                                            console.log(`[DELETE SALE] Product ${product.productCode} not in stock, creating with -${quantity}`);
                                                            db.run(
                                                                `INSERT INTO stock 
                                                                (product_code, product_name, quantity, last_updated) 
                                                                VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
                                                                [product.productCode, product.productName || 'Unknown', -quantity],
                                                                (err) => {
                                                                    if (err) {
                                                                        console.error(`[DELETE SALE] Error inserting stock: ${err.message}`);
                                                                        reject(err);
                                                                    } else {
                                                                        console.log(`[DELETE SALE] Successfully created stock with -${quantity} for ${product.productCode}`);
                                                                        resolve();
                                                                    }
                                                                }
                                                            );
                                                        } else {
                                                            // Allow negative stock if necessary for accurate accounting
                                                            const currentQty = stockRow.quantity || 0;
                                                            const newQuantity = currentQty - quantity;
                                                            console.log(`[DELETE SALE] Updating ${product.productCode} stock: ${currentQty} - ${quantity} = ${newQuantity}`);
                                                            
                                                            db.run(
                                                                `UPDATE stock 
                                                                SET quantity = ?,
                                                                    last_updated = CURRENT_TIMESTAMP 
                                                                WHERE product_code = ?`,
                                                                [newQuantity, product.productCode],
                                                                (err) => {
                                                                    if (err) {
                                                                        console.error(`[DELETE SALE] Error updating stock: ${err.message}`);
                                                                        reject(err);
                                                                    } else {
                                                                        console.log(`[DELETE SALE] Successfully updated stock to ${newQuantity} for ${product.productCode}`);
                                                                        resolve();
                                                                    }
                                                                }
                                                            );
                                                        }
                                                    }
                                                );
                                            });
                                            
                                            // Wait for the stock update to complete before continuing
                                            await updateStockPromise;
                                        }
                                    } catch (parseError) {
                                        console.error(`[DELETE SALE] Error parsing return products: ${parseError.message}`);
                                        // Continue with other returns even if one fails
                                    }
                                }
                                
                                // Only after all stock updates are done, delete salesreturn records
                                console.log(`[DELETE SALE] All returned products processed, now deleting salesreturn records)`);
                                await new Promise((resolve, reject) => {
                                    db.run(
                                        'DELETE FROM salesreturn WHERE returninvoice_no = ?',
                                        [invoiceNumber],
                                        (err) => {
                                            if (err) {
                                                console.error(`[DELETE SALE] Error deleting salesreturn records: ${err.message}`);
                                                reject(err);
                                            } else {
                                                console.log(`[DELETE SALE] Successfully deleted salesreturn records for invoice #${invoiceNumber}`);
                                                resolve();
                                            }
                                        }
                                    );
                                });
                            }

                            // Finally delete the sale record
                            console.log(`[DELETE SALE] Deleting sale record for invoice #${invoiceNumber}`);
                            db.run(
                                'DELETE FROM sales WHERE invoice_number = ?',
                                [invoiceNumber],
                                (err) => {
                                    if (err) {
                                        console.error(`[DELETE SALE] Error deleting sale: ${err.message}`);
                                        db.run('ROLLBACK');
                                        reject(err);
                                    } else {
                                        db.run('COMMIT');
                                        console.log(`[DELETE SALE] Successfully deleted sale #${invoiceNumber} and updated stock`);
                                        resolve({ 
                                            success: true, 
                                            message: 'Sale deleted successfully and stock updated' 
                                        });
                                    }
                                }
                            );
                        } catch (parseError) {
                            console.error(`[DELETE SALE] Error parsing sale products: ${parseError.message}`);
                            db.run('ROLLBACK');
                            reject(new Error('Invalid sale data format'));
                        }
                    }
                );
            } catch (error) {
                console.error(`[DELETE SALE] Transaction error: ${error.message}`);
                db.run('ROLLBACK');
                reject(error);
            }
        });
    });
};



// Get the last used barcode from the database
// database.js (continued)
// Get the last used barcode from the database
function getLastBarcode() {
    return new Promise((resolve, reject) => {
        const query = `SELECT value FROM settings WHERE key = 'last_barcode'`;
        db.get(query, (err, row) => {
            if (err) {
                console.error('Database error:', err);
                reject(err);
                return;
            }
            
            if (!row) {
                // No record found, return default starting barcode
                resolve('A000001');
                return;
            }
            
            resolve(row.value);
        });
    });
}

// Save the last barcode to the database
function saveLastBarcode(barcode) {
    return new Promise((resolve, reject) => {
        if (!barcode) {
            reject(new Error('Barcode cannot be empty'));
            return;
        }
        
        // First check if the record exists
        db.get("SELECT 1 FROM settings WHERE key = 'last_barcode'", (err, row) => {
            if (err) {
                console.error('Database error:', err);
                reject(err);
                return;
            }
            
            let query, params;
            if (row) {
                // Update existing record
                query = `UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'last_barcode'`;
                params = [barcode];
            } else {
                // Insert new record
                query = `INSERT INTO settings (key, value) VALUES ('last_barcode', ?)`;
                params = [barcode];
            }
            
            db.run(query, params, function(err) {
                if (err) {
                    console.error('Error saving last barcode:', err);
                    reject(err);
                    return;
                }
                
                resolve(true);
            });
        });
    });
}




module.exports = { 
    getMonthlyTransactionDetails,
    getDailySalesData,
    getProductDetails,
    // New exports
    getLastBarcode,
    saveLastBarcode,
    initializeDatabase,
    logBackup,
    getBackupHistory,
    getDatabasePath,
    clearBackupHistory,
    close,
    open,updatePurchasePayment,  getProductDetails,getMonthlyTransactionDetails,getMonthlySalesData,getDailySalesData,getCustomerTransactions,getTransactionDetails,getAllSales, addSalesReturn , getAllSalesReturns,validateUser, getPurchaseReturnsByDateRange,addUser, findUser, getAllUsers, updatePassword,addSupplier,getSuppliers,
    deleteSupplier, updateSupplier, addCompany, getCompanies, deleteCompany, updateCompany,
    addCategory, getCategories, updateCategory, deleteCategory, addSubcategory, getAllSubcategories,
    deleteSubcategory, updateSubcategoryInDB, addCustomer, getCustomers, deleteCustomer, updateCustomer,
    getUserProfile, insertProduct, getSales, getSaleById, getAllProducts, deleteProduct, updateProduct,
    addPurchase, deletePurchaseReturn, addSale, getTransactionDetailssupplier, getSupplierTransactions,
    addExpense,getPaymentHistory,
getExpenses,
updateExpense,getPurchaseReturnPaymentHistory,updatePurchaseReturnPayment,
deleteExpense,
    getAllPurchases, getAllUsersDetails,deleteUser,
    closeDatabase() {
        db.close();
      }, 
      getAll: (tableName) => {
        return new Promise((resolve, reject) => {
            db.all(`SELECT * FROM ${tableName}`, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },getSalesReturnsByDateRange,
 updateStock, deletePurchase, getAllStock, addPurchasereturn, getAllPurchaseReturns,deleteSale,checkPurchaseExists
};