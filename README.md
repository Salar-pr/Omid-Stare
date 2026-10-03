<div align="center">🌀 OMID-STARE

Psychedelic Music · E-Commerce · Digital Albums · CMS

<p>
  <strong>A full-stack Persian-first digital platform for OMID RASTAR</strong>
</p><p>
  <em>Where time dissolves and the guitar speaks.</em>
</p><br><img src="https://img.shields.io/badge/Node.js-20%2B-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js">
<img src="https://img.shields.io/badge/Fastify-5-000000?style=for-the-badge&logo=fastify&logoColor=white" alt="Fastify">
<img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
<img src="https://img.shields.io/badge/Vanilla_JS-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript"><br><br>

<img src="https://img.shields.io/badge/Architecture-Modular_Monolith-8A2BE2?style=for-the-badge" alt="Architecture">
<img src="https://img.shields.io/badge/RTL-Persian_First-00C896?style=for-the-badge" alt="RTL">
<img src="https://img.shields.io/badge/Auth-Session_Based-FF4B91?style=for-the-badge" alt="Authentication">
<img src="https://img.shields.io/badge/Security-Argon2id-FF6B35?style=for-the-badge" alt="Security"></div><br><div align="center"><a href="#overview">Overview</a>
  •  
<a href="#features">Features</a>
  •  
<a href="#architecture">Architecture</a>
  •  
<a href="#tech-stack">Tech Stack</a>
  •  
<a href="#security-model">Security</a>
  •  
<a href="#quick-start">Quick Start</a>
  •  
<a href="#api">API</a>
  •  
<a href="#roadmap">Roadmap</a>

</div>---

<h2 id="overview">🌌 Overview</h2><p>
<strong>Omid-Stare</strong> is a modern full-stack music and e-commerce platform created for
<strong>OMID RASTAR</strong>, combining a psychedelic/progressive music experience with a complete
digital storefront, customer account system, CMS, and administration platform.
</p><p>
Rather than functioning as a traditional static artist website, Omid-Stare provides a complete
digital ecosystem for music discovery, merchandise, customer interaction, and platform management.
</p><table>
<tr>
<td width="50%"><h3>🎵 Music</h3><ul>
<li>Album catalog</li>
<li>Track management</li>
<li>In-page audio playback</li>
<li>Album artwork</li>
<li>Persian & English metadata</li>
<li>Related merchandise</li>
</ul></td><td width="50%"><h3>🛍️ Commerce</h3><ul>
<li>Product catalog</li>
<li>Persistent shopping cart</li>
<li>Wishlist</li>
<li>Coupons</li>
<li>Orders</li>
<li>Reviews & Q&A</li>
</ul></td>
</tr><tr>
<td><h3>⚙️ Platform</h3><ul>
<li>Admin dashboard</li>
<li>CMS</li>
<li>User management</li>
<li>Order management</li>
<li>Content management</li>
<li>Notifications</li>
</ul></td><td><h3>🇮🇷 Localization</h3><ul>
<li>Full RTL interface</li>
<li>Persian typography</li>
<li>Persian numbers</li>
<li>Jalali calendar</li>
<li>Toman-based pricing</li>
<li>Persian UI messages</li>
</ul></td>
</tr>
</table><br><table>
<tr>
<td align="center"><strong>~19</strong><br>Database Tables</td>
<td align="center"><strong>~73</strong><br>API Endpoints</td>
<td align="center"><strong>13</strong><br>HTML Pages</td>
<td align="center"><strong>34</strong><br>Automated Tests</td>
<td align="center"><strong>100%</strong><br>RTL Ready</td>
</tr>
</table>---

<h2 id="features">✨ Key Features</h2><h3>🎸 Music Platform</h3><ul>
<li>Artist-focused homepage</li>
<li>Album catalog and album detail pages</li>
<li>Track listings and metadata</li>
<li>Integrated HTML5 audio player</li>
<li>Album artwork and visual presentation</li>
<li>Release year and genre information</li>
<li>Persian and English album metadata</li>
<li>Related merchandise</li>
<li>Vinyl-inspired album experience</li>
</ul><h3>🛒 E-Commerce</h3><ul>
<li>Product catalog</li>
<li>Search and filtering</li>
<li>Sorting and pagination</li>
<li>Product galleries</li>
<li>Product specifications and features</li>
<li>Product variants</li>
<li>Size and color selection</li>
<li>Inventory management</li>
<li>Promotional pricing</li>
<li>Persistent server-side shopping cart</li>
<li>Wishlist management</li>
<li>Coupon campaigns</li>
<li>Discount codes</li>
<li>Order creation and tracking</li>
<li>Product reviews</li>
<li>Product questions and answers</li>
</ul><h3>👤 Authentication & Accounts</h3><ul>
<li>Secure registration</li>
<li>Session-based login</li>
<li>Server-side authentication</li>
<li>Persistent customer accounts</li>
<li>Profile management</li>
<li>Password changes</li>
<li>User-owned carts and wishlists</li>
<li>Order ownership</li>
<li>Review authorization</li>
</ul><h3>🎟️ Coupon System</h3><ul>
<li>Percentage discounts</li>
<li>Fixed-amount discounts</li>
<li>Campaign-based coupons</li>
<li>Expiration dates</li>
<li>Usage limits</li>
<li>Product-specific campaigns</li>
<li>Generated coupon codes</li>
<li>Atomic coupon claiming</li>
<li>SHA-256 coupon storage</li>
</ul><h3>📝 CMS</h3><p>
Selected website content can be managed directly from the administration dashboard without
modifying frontend source files.
</p><ul>
<li>Hero content</li>
<li>Manifesto</li>
<li>Social links</li>
<li>Featured products</li>
<li>Welcome content</li>
<li>General site configuration</li>
</ul>---

<h2 id="architecture">🏗️ Architecture</h2><p>
Omid-Stare follows a <strong>modular monolith architecture</strong>.
The application runs as a single Fastify service while business domains remain separated into
independent modules.
</p><pre>
                         ┌──────────────────────┐
                         │      Web Browser      │
                         │                      │
                         │ HTML + CSS + JS      │
                         │ Persian / RTL UI     │
                         └──────────┬───────────┘
                                    │
                                    │ HTTP / Fetch
                                    │ Session Cookie
                                    ▼
                         ┌──────────────────────┐
                         │      Fastify 5       │
                         │                      │
                         │ Helmet               │
                         │ Rate Limit           │
                         │ Cookies              │
                         │ CSRF Protection      │
                         │ Validation           │
                         │ Compression          │
                         │ OpenAPI              │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │    Service Layer     │
                         │                      │
                         │ Auth                 │
                         │ Users                │
                         │ Products             │
                         │ Albums               │
                         │ Cart                 │
                         │ Orders               │
                         │ Wishlist             │
                         │ Coupons              │
                         │ Reviews              │
                         │ Questions            │
                         │ CMS                  │
                         │ Admin                │
                         └──────────┬───────────┘
                                    │
                                    │ Parameterized SQL
                                    ▼
                         ┌──────────────────────┐
                         │    PostgreSQL 16     │
                         │                      │
                         │ 19 relational tables │
                         └──────────────────────┘
</pre><h3>Application Layers</h3><table>
<thead>
<tr>
<th>Layer</th>
<th>Responsibility</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>Frontend</strong></td>
<td>UI, navigation, interactions, audio playback, cart and API communication</td>
</tr>
<tr>
<td><strong>Routes</strong></td>
<td>HTTP handling, request parsing and validation</td>
</tr>
<tr>
<td><strong>Services</strong></td>
<td>Business logic, transactions and database operations</td>
</tr>
<tr>
<td><strong>Database</strong></td>
<td>Persistent application state and relational data</td>
</tr>
</tbody>
</table>---

<h2 id="tech-stack">🛠️ Tech Stack</h2><h3>Backend</h3><table>
<tr>
<th>Technology</th>
<th>Purpose</th>
</tr>
<tr><td>Node.js 20+</td><td>Runtime</td></tr>
<tr><td>Fastify 5</td><td>HTTP server and API</td></tr>
<tr><td>PostgreSQL 16</td><td>Primary database</td></tr>
<tr><td>pg</td><td>PostgreSQL driver</td></tr>
<tr><td>Zod</td><td>Request validation</td></tr>
<tr><td>Argon2</td><td>Password hashing</td></tr>
<tr><td>Helmet</td><td>Security headers</td></tr>
<tr><td>Rate Limit</td><td>Abuse and brute-force protection</td></tr>
<tr><td>Cookie</td><td>Session cookie management</td></tr>
<tr><td>Multipart</td><td>File uploads</td></tr>
<tr><td>Compression</td><td>HTTP response compression</td></tr>
<tr><td>Static</td><td>Frontend asset serving</td></tr>
</table><h3>Frontend</h3><p>
The frontend intentionally uses native web technologies instead of a large JavaScript framework.
</p><table>
<tr>
<th>Technology</th>
<th>Purpose</th>
</tr>
<tr><td>HTML5</td><td>Page structure</td></tr>
<tr><td>CSS3</td><td>Visual design system</td></tr>
<tr><td>Vanilla JavaScript</td><td>Application logic</td></tr>
<tr><td>HTML5 Audio API</td><td>Music playback</td></tr>
<tr><td>Fetch API</td><td>Backend communication</td></tr>
<tr><td>Vazirmatn</td><td>Persian typography</td></tr>
<tr><td>Space Grotesk</td><td>Latin/display typography</td></tr>
</table><p>
There is intentionally no React, Vue, Angular, Next.js, Tailwind, Bootstrap, Vite or Webpack
dependency in the frontend.
</p><h3>Database</h3><ul>
<li>PostgreSQL 16</li>
<li>Parameterized SQL</li>
<li>Relational schema</li>
<li>Transactions</li>
<li>Database migrations</li>
<li>Seed data</li>
</ul>---

<h2 id="security-model">🔐 Security Model</h2><p>
Security is treated as a first-class architectural concern throughout the application.
</p><h3>Password Security</h3><pre>
User Password
      │
      ▼
   Argon2id
      │
      ▼
Password Hash
      │
      ▼
 PostgreSQL
</pre><p>
Passwords are never stored in plain text.
</p><h3>Session Security</h3><pre>
Browser
   │
   │ HttpOnly Cookie
   ▼
Session Token
   │
   │ SHA-256
   ▼
Database Session Hash
</pre><p>
The raw session token is never persisted in the database.
</p><ul>
<li>HttpOnly cookies</li>
<li>SameSite protection</li>
<li>Secure cookies in production</li>
<li>Session expiration</li>
<li>Periodic session cleanup</li>
</ul><h3>Input Validation</h3><p>
External input is validated with <strong>Zod</strong> before reaching business logic.
</p><h3>SQL Injection Protection</h3><p>
Database operations use parameterized PostgreSQL queries.
</p><pre>
SELECT *
FROM products
WHERE id = $1
</pre><h3>Authorization</h3><p>
Administrative permissions are enforced on the backend. Hiding an admin button in the frontend
does not provide authorization.
</p><h3>Additional Security Controls</h3><ul>
<li>Argon2id password hashing</li>
<li>Secure server-side sessions</li>
<li>CSRF protection</li>
<li>Rate limiting</li>
<li>Parameterized SQL</li>
<li>Zod validation</li>
<li>Helmet security headers</li>
<li>HSTS</li>
<li>X-Content-Type-Options</li>
<li>X-Frame-Options</li>
<li>Referrer-Policy</li>
<li>Upload MIME validation</li>
<li>Random upload filenames</li>
<li>Request body limits</li>
<li>HTML escaping</li>
<li>Admin authorization middleware</li>
<li>Role validation</li>
<li>Admin self-demotion protection</li>
</ul>---

<h2 id="project-structure">📁 Project Structure</h2><pre>
Omid-Stare/
│
├── index.html
├── shop.html
├── product.html
├── albums.html
├── album.html
├── cart.html
├── orders.html
├── wishlist.html
├── account.html
├── profile.html
├── edit-profile.html
├── contact.html
├── admin.html
│
├── css/
│   ├── main.css
│   ├── theme-psych.css
│   └── ...
│
├── js/
│   ├── api.js
│   ├── nav.js
│   ├── toast.js
│   ├── fx.js
│   ├── shop.js
│   ├── product.js
│   ├── cart.js
│   ├── orders.js
│   ├── wishlist.js
│   ├── albums.js
│   ├── account.js
│   ├── profile.js
│   └── ...
│
├── images/
│
├── server/
│   ├── src/
│   │   ├── server.js
│   │   ├── app.js
│   │   │
│   │   ├── config/
│   │   ├── db/
│   │   ├── middlewares/
│   │   │
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── products/
│   │   │   ├── albums/
│   │   │   ├── cart/
│   │   │   ├── orders/
│   │   │   ├── wishlist/
│   │   │   ├── coupons/
│   │   │   ├── reviews/
│   │   │   ├── questions/
│   │   │   ├── content/
│   │   │   ├── contact/
│   │   │   └── admin/
│   │   │
│   │   ├── services/
│   │   └── utils/
│   │
│   ├── migrations/
│   ├── scripts/
│   └── test/
│
├── docker-compose.yml
├── AUDIT.md
├── PROJECT-OVERVIEW.md
├── REVIEW.md
├── SECURITY-AUDIT.md
└── README.md
</pre><h3>Backend Module Pattern</h3><pre>
module/
├── module.routes.js
└── module.service.js
</pre><p>
Routes handle HTTP concerns while services contain domain and business logic.
</p>---

<h2 id="quick-start">🚀 Quick Start</h2><p>
The easiest local development setup uses the project's embedded PostgreSQL workflow.
</p><h3>Terminal 1 — Database</h3><pre>
cd Omid-Stare/server
npm install
npm run db:embedded
</pre><h3>Terminal 2 — Application</h3><pre>
cd Omid-Stare/server
npm start
</pre><p>
Then open:
</p><pre>
http://localhost:3000
</pre><p>
The Fastify server serves both the API and frontend assets, so a separate frontend development
server is not required.
</p>---

<h2 id="backend-setup">⚙️ Backend Setup</h2><h3>1. Install dependencies</h3><pre>
cd server
npm install
</pre><h3>2. Configure environment</h3><pre>
cp .env.example .env
</pre><p>
On Windows:
</p><pre>
copy .env.example .env
</pre><h3>3. Start development PostgreSQL</h3><pre>
npm run db:embedded
</pre><h3>4. Run migrations</h3><pre>
npm run migrate
</pre><h3>5. Seed development data</h3><pre>
npm run seed
</pre><h3>6. Start the application</h3><pre>
npm start
</pre>---

<h2 id="database">🗄️ Database</h2><p>
Omid-Stare currently uses approximately <strong>19 relational PostgreSQL tables</strong>.
</p><table>
<thead>
<tr>
<th>Domain</th>
<th>Tables</th>
</tr>
</thead>
<tbody>
<tr>
<td>Authentication</td>
<td><code>users</code>, <code>sessions</code></td>
</tr>
<tr>
<td>Music</td>
<td><code>albums</code>, <code>album_tracks</code></td>
</tr>
<tr>
<td>Commerce</td>
<td><code>products</code>, <code>carts</code>, <code>cart_items</code>, <code>orders</code>, <code>order_items</code>, <code>order_status_history</code></td>
</tr>
<tr>
<td>Customer</td>
<td><code>user_wishlist</code>, <code>reviews</code>, <code>product_questions</code></td>
</tr>
<tr>
<td>Promotions</td>
<td><code>coupon_campaigns</code>, <code>coupons</code></td>
</tr>
<tr>
<td>Platform</td>
<td><code>contact_messages</code>, <code>site_content</code>, <code>notifications</code>, <code>app_sequences</code></td>
</tr>
</tbody>
</table><h3>Order Snapshots</h3><p>
Order items retain historical product information such as the original product name and unit
price. This prevents historical orders from changing when the catalog is modified later.
</p>---

<h2 id="authentication">🔑 Authentication Flow</h2><h3>Registration</h3><pre>
POST /api/auth/register
</pre><p>
The server validates registration data and creates the user account with an Argon2id password hash.
</p><h3>Login</h3><pre>
POST /api/auth/login
</pre><pre>
Credentials
    │
    ▼
Find User
    │
    ▼
Verify Argon2id Hash
    │
    ▼
Create Session
    │
    ▼
Set HttpOnly Cookie
</pre><h3>Authenticated Request</h3><pre>
Request
   │
   ▼
Session Cookie
   │
   ▼
Hash Session Token
   │
   ▼
Find Session
   │
   ▼
Validate Session
   │
   ▼
Load User
   │
   ▼
Authorize
</pre><h3>Logout</h3><pre>
POST /api/auth/logout
</pre><p>
The session is invalidated server-side.
</p>---

<h2 id="ecommerce">🛍️ E-Commerce Flow</h2><h3>Product Discovery</h3><pre>
Catalog
  │
  ├── Search
  ├── Category
  ├── Sorting
  └── Pagination
        │
        ▼
   Product Details
</pre><h3>Cart</h3><pre>
Product
   │
   ▼
Add to Cart
   │
   ▼
Server-side Cart
   │
   ├── Quantity
   ├── Variant
   └── Stock
   │
   ▼
Cart Summary
</pre><p>
The browser is never treated as the source of truth for price, stock, discount, or order totals.
</p><h3>Transactional Checkout</h3><pre>
Create Order
     │
     ├── Validate Inventory
     ├── Calculate Prices
     ├── Apply Coupon
     ├── Create Order Items
     ├── Decrease Stock
     ├── Redeem Coupon
     └── Clear Cart
            │
            ▼
      Commit Transaction
</pre>---

<h2 id="music">💿 Music & Album System</h2><p>
Music is implemented as a first-class domain rather than static website content.
</p><h3>Albums</h3><ul>
<li>English title</li>
<li>Persian title</li>
<li>Release year</li>
<li>Genre</li>
<li>Cover artwork</li>
<li>Description</li>
<li>Publication state</li>
</ul><h3>Tracks</h3><ul>
<li>Track title</li>
<li>Track number</li>
<li>Duration</li>
<li>Audio URL</li>
</ul><p>
Album pages include an integrated audio player and a visual experience inspired by physical vinyl
records.
</p>---

<h2 id="admin">⚙️ Admin Panel</h2><p>
Omid-Stare includes a dedicated administration dashboard for managing the complete application.
</p><h3>Dashboard</h3><ul>
<li>Platform statistics</li>
<li>User statistics</li>
<li>Product statistics</li>
<li>Order information</li>
<li>Operational information</li>
</ul><h3>Product Management</h3><ul>
<li>Create products</li>
<li>Edit products</li>
<li>Delete products</li>
<li>Manage inventory</li>
<li>Manage variants</li>
<li>Manage pricing</li>
<li>Manage images</li>
</ul><h3>Order Management</h3><ul>
<li>View orders</li>
<li>Inspect order items</li>
<li>Update order status</li>
<li>Track status history</li>
<li>Review customer information</li>
</ul><h3>User Management</h3><ul>
<li>View users</li>
<li>Manage profiles</li>
<li>Manage roles</li>
<li>Review customer activity</li>
</ul><h3>CMS Management</h3><p>
Administrators can update selected website content without changing frontend source code.
</p>---

<h2 id="api">🌐 API Overview</h2><p>
The backend currently exposes approximately <strong>73 REST API endpoints</strong>.
</p><h3>Health</h3><pre>
GET /api/health
</pre><h3>Authentication</h3><pre>
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
</pre><h3>Products</h3><pre>
GET /api/products
GET /api/products/:idOrSlug
</pre><h3>Albums</h3><pre>
GET /api/albums
GET /api/albums/:id
</pre><h3>Cart</h3><pre>
GET    /api/cart
POST   /api/cart/items
PATCH  /api/cart/items/:id
DELETE /api/cart/items/:id
GET    /api/cart/summary
POST   /api/cart/quote
</pre><h3>Orders</h3><pre>
GET  /api/orders
POST /api/orders
GET  /api/orders/:id
</pre><h3>Wishlist</h3><pre>
GET    /api/wishlist
POST   /api/wishlist/:productId
DELETE /api/wishlist/:productId
</pre><h3>Coupons</h3><pre>
POST /api/coupons/claim
GET  /api/coupons/my
</pre><h3>Reviews</h3><pre>
GET  /api/products/:productId/reviews
POST /api/reviews
</pre><h3>Questions</h3><pre>
GET  /api/products/:productId/questions
POST /api/questions
</pre><h3>CMS</h3><pre>
GET /api/content
GET /api/content/:key
</pre><h3>Contact</h3><pre>
POST /api/contact
</pre><h3>OpenAPI</h3><pre>
GET /api/docs
GET /api/docs.json
</pre>---

<h2 id="environment">🔧 Environment Variables</h2><p>
The canonical list of environment variables is maintained in:
</p><pre>
server/.env.example
</pre><table>
<thead>
<tr>
<th>Variable</th>
<th>Purpose</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>DATABASE_URL</code></td>
<td>PostgreSQL connection string</td>
</tr>
<tr>
<td><code>PORT</code></td>
<td>HTTP server port</td>
</tr>
<tr>
<td><code>HOST</code></td>
<td>Server bind address</td>
</tr>
<tr>
<td><code>NODE_ENV</code></td>
<td>Runtime environment</td>
</tr>
<tr>
<td><code>COOKIE_SECRET</code></td>
<td>Session cookie signing secret</td>
</tr>
<tr>
<td><code>APP_URL</code></td>
<td>Public application URL</td>
</tr>
<tr>
<td><code>UPLOAD_DIR</code></td>
<td>Persistent upload directory</td>
</tr>
</tbody>
</table><blockquote>
<strong>⚠️ Never commit your <code>.env</code> file or production secrets to Git.</strong>
</blockquote>---

<h2 id="development">💻 Development Commands</h2><table>
<thead>
<tr>
<th>Command</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>npm install</code></td>
<td>Install dependencies</td>
</tr>
<tr>
<td><code>npm run db:embedded</code></td>
<td>Start development PostgreSQL</td>
</tr>
<tr>
<td><code>npm run migrate</code></td>
<td>Run database migrations</td>
</tr>
<tr>
<td><code>npm run seed</code></td>
<td>Seed development data</td>
</tr>
<tr>
<td><code>npm start</code></td>
<td>Start Fastify application</td>
</tr>
<tr>
<td><code>npm test</code></td>
<td>Run automated tests</td>
</tr>
</tbody>
</table>---

<h2 id="testing">🧪 Testing</h2><p>
The project contains an automated test suite based on Node.js testing infrastructure.
</p><p>
Current repository verification includes approximately <strong>34 automated tests</strong>.
</p><table>
<thead>
<tr>
<th>Area</th>
<th>Coverage</th>
</tr>
</thead>
<tbody>
<tr>
<td>Authentication</td>
<td>Registration, login, logout, sessions</td>
</tr>
<tr>
<td>Customer</td>
<td>Profiles, cart, wishlist, coupons, orders</td>
</tr>
<tr>
<td>Security</td>
<td>Authorization, validation, uploads, regressions</td>
</tr>
<tr>
<td>API</td>
<td>Public, customer and admin endpoints</td>
</tr>
</tbody>
</table><h3>Project Documentation</h3><pre>
AUDIT.md
PROJECT-OVERVIEW.md
REVIEW.md
SECURITY-AUDIT.md
</pre>---

<h2 id="production">🚢 Production Notes</h2><h3>Security</h3><ol>
<li>Use a strong random <code>COOKIE_SECRET</code>.</li>
<li>Deploy behind HTTPS.</li>
<li>Enable secure cookies.</li>
<li>Configure trusted proxy settings correctly.</li>
<li>Restrict allowed origins.</li>
<li>Never expose development credentials.</li>
<li>Never commit <code>.env</code>.</li>
<li>Review Content Security Policy requirements.</li>
</ol><h3>Database</h3><ol>
<li>Use production PostgreSQL.</li>
<li>Configure automated backups.</li>
<li>Run migrations explicitly.</li>
<li>Monitor database health.</li>
<li>Regularly test database restoration.</li>
</ol><h3>Persistent Storage</h3><p>
Uploaded media requires persistent storage.
For cloud deployments, object storage is recommended:
</p><ul>
<li>Amazon S3</li>
<li>Cloudflare R2</li>
<li>Google Cloud Storage</li>
<li>Azure Blob Storage</li>
</ul><h3>Recommended Deployment</h3><pre>
                     Internet
                        │
                        ▼
                ┌───────────────┐
                │ Nginx / Caddy │
                │ HTTPS         │
                └───────┬───────┘
                        │
                        ▼
                ┌───────────────┐
                │    Fastify    │
                │   Node.js     │
                └───────┬───────┘
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
       ┌──────────────┐   ┌──────────────┐
       │ PostgreSQL   │   │ Object/File  │
       │              │   │ Storage      │
       └──────────────┘   └──────────────┘
</pre>---

<h2 id="limitations">⚠️ Current Limitations</h2><table>
<thead>
<tr>
<th>Area</th>
<th>Status</th>
</tr>
</thead>
<tbody>
<tr>
<td>Payment Gateway</td>
<td>Not yet integrated</td>
</tr>
<tr>
<td>CI/CD</td>
<td>Not yet configured</td>
</tr>
<tr>
<td>Strict CSP</td>
<td>Future hardening</td>
</tr>
<tr>
<td>Cloud Media Storage</td>
<td>Future integration</td>
</tr>
<tr>
<td>Production Observability</td>
<td>Requires infrastructure integration</td>
</tr>
</tbody>
</table>---

<h2 id="roadmap">🧭 Roadmap</h2><h3>Commerce</h3><ul>
<li>⬜ Real payment gateway integration</li>
<li>⬜ Shipping provider integration</li>
<li>⬜ Automated order notifications</li>
<li>⬜ Invoice generation</li>
<li>⬜ Refund workflow</li>
</ul><h3>Infrastructure</h3><ul>
<li>⬜ GitHub Actions CI/CD</li>
<li>⬜ Automated migration checks</li>
<li>⬜ Dependency/security scanning</li>
<li>⬜ Docker production configuration</li>
<li>⬜ Production monitoring</li>
<li>⬜ Automated backups</li>
</ul><h3>Security</h3><ul>
<li>⬜ Strict Content Security Policy</li>
<li>⬜ Nonce-based script architecture</li>
<li>⬜ Centralized audit logging</li>
<li>⬜ Advanced abuse detection</li>
</ul><h3>Media</h3><ul>
<li>⬜ Object storage integration</li>
<li>⬜ Image optimization</li>
<li>⬜ Audio CDN</li>
<li>⬜ Automatic media processing</li>
</ul>---

<h2 id="status">📊 Project Status</h2><table>
<thead>
<tr>
<th>Category</th>
<th>Implementation</th>
</tr>
</thead>
<tbody>
<tr><td>Architecture</td><td>Modular Monolith</td></tr>
<tr><td>Runtime</td><td>Node.js 20+</td></tr>
<tr><td>Backend</td><td>Fastify 5</td></tr>
<tr><td>Database</td><td>PostgreSQL 16</td></tr>
<tr><td>Frontend</td><td>Vanilla HTML / CSS / JavaScript</td></tr>
<tr><td>Database Tables</td><td>~19</td></tr>
<tr><td>API Endpoints</td><td>~73</td></tr>
<tr><td>Automated Tests</td><td>34</td></tr>
<tr><td>Authentication</td><td>Server-side Sessions</td></tr>
<tr><td>Password Hashing</td><td>Argon2id</td></tr>
<tr><td>Validation</td><td>Zod</td></tr>
<tr><td>Admin Panel</td><td>Included</td></tr>
<tr><td>CMS</td><td>Included</td></tr>
<tr><td>E-Commerce</td><td>Included</td></tr>
<tr><td>Music Catalog</td><td>Included</td></tr>
<tr><td>OpenAPI</td><td>Included</td></tr>
<tr><td>Payment Gateway</td><td>Not Integrated</td></tr>
<tr><td>CI/CD</td><td>Planned</td></tr>
</tbody>
</table>---

<h2 id="contributing">🤝 Contributing</h2><p>
Contributions and improvements are welcome.
</p><ol>
<li>Preserve the existing architecture.</li>
<li>Keep business logic inside service modules.</li>
<li>Validate all external input.</li>
<li>Never trust client-side prices or inventory.</li>
<li>Preserve Persian RTL localization.</li>
<li>Add regression tests for bug fixes.</li>
<li>Never commit credentials or secrets.</li>
<li>Keep API response structures consistent.</li>
<li>Run the test suite before submitting changes.</li>
<li>Update documentation when introducing new APIs.</li>
</ol>---

<h2 id="security">🛡️ Security</h2><p>
If you discover a security vulnerability, please do not publish exploit details in a public issue.
Report security issues privately to the project maintainer with enough information to reproduce and
evaluate the problem.
</p>---

<h2 id="license">📄 License</h2><p>
See the repository's license file for the applicable licensing terms.
</p><br><div align="center"><hr><h2>🌀 OMID RASTAR</h2><h3>PSYCHEDELIC PROGRESSIVE</h3><p>
<strong>Music · Merch · Albums · Void</strong>
</p><p>
<em>Where time dissolves and the guitar speaks.</em>
</p><p>
🌀 &nbsp; 🖤 &nbsp; 🎸
</p></div>
