# Application Test Plan

This document outlines the test cases for the Local Commerce application, covering all major features to ensure full functionality and can be used as a blueprint for achieving high test coverage.

## 1. User Authentication & Accounts

### 1.1. Customer Signup & Login
- **Test Case 1.1.1**: A new user can successfully sign up with a unique email, name, and password.
  - **Steps**: Navigate to signup, fill form with valid data, submit.
  - **Expected**: "Account Created" toast appears, user is prompted to log in.
- **Test Case 1.1.2**: Attempt to sign up with an existing email.
  - **Steps**: Navigate to signup, use an email that already exists in the system.
  - **Expected**: "Signup Failed" error toast appears, indicating the email is already in use.
- **Test Case 1.1.3**: A registered customer can log in with correct credentials.
  - **Steps**: Navigate to login, enter valid customer email and password, submit.
  - **Expected**: "Login Successful" toast appears, user is redirected to the `/products` page.
- **Test Case 1.1.4**: Attempt to log in with incorrect password.
  - **Steps**: Navigate to login, enter valid customer email and incorrect password.
  - **Expected**: "Login Failed" error toast appears.

### 1.2. Admin Login
- **Test Case 1.2.1**: Admin can log in with "a" / "a".
  - **Steps**: Navigate to login, toggle to Admin login, use "a" for username and "a" for password.
  - **Expected**: "Login Successful" toast appears, user is redirected to `/admin/dashboard`.
- **Test Case 1.2.2**: A regular customer cannot log in via the admin portal.
  - **Steps**: Navigate to login, toggle to Admin login, use valid customer credentials.
  - **Expected**: "Login Failed" error toast appears.

### 1.3. User Session & Profile
- **Test Case 1.3.1**: A logged-in user can log out.
  - **Steps**: Click user avatar, select "Logout".
  - **Expected**: User is logged out, redirected to the home/products page, and the login button reappears in the navbar.
- **Test Case 1.3.2**: A logged-in user can update their profile name.
  - **Steps**: Navigate to `/profile`, change the name in the form, and save.
  - **Expected**: "Profile Updated" toast appears, and the new name is reflected in the navbar.
- **Test Case 1.3.3**: A user's public profile page is accessible and displays job stats.
  - **Steps**: As any user, click on a job creator's name from the `/jobs` page.
  - **Expected**: Redirected to `/users/[userId]`, which displays the user's name, join date, average job rating, and any reviews they have received.

---
## 2. Admin Panel Functionality

### 2.1. Product & Category Management
- **Test Case 2.1.1**: Admin can create a new product category.
- **Test Case 2.1.2**: Admin can create a new product, assign it a category, and upload images.
- **Test Case 2.1.3**: Admin can edit an existing product's details, including changing its price, stock, and images.
- **Test Case 2.1.4**: Admin can delete a product, and confirms its associated images are also removed.

### 2.2. Job & Job Category Management
- **Test Case 2.2.1**: Admin can create, edit, and delete a job category.
- **Test Case 2.2.2**: Admin can view all jobs posted on the platform.
- **Test Case 2.2.3**: Admin can mark a job as "Verified", and the badge appears on the public listing.
- **Test Case 2.2.4**: Admin can update global job settings (e.g., max active jobs) and the new rules are enforced.

### 2.3. User Management
- **Test Case 2.3.1**: Admin can view all registered users.
- **Test Case 2.3.2**: Admin can create a new user (customer or admin).
- **Test Case 2.3.3**: Admin can edit an existing user's details (name, role, password).
- **Test Case 2.3.4**: Admin can delete a user account.
- **Test Case 2.3.5**: Admin cannot delete their own account.

### 2.4. AI Tools & Logs
- **Test Case 2.4.1**: Admin can use the Shipping Label Engine to parse an Indian address successfully.
- **Test Case 2.4.2**: Admin can view a log of all administrative actions performed.

---
## 3. Customer Shopping & Product Experience

- **Test Case 3.1**: User can view product listings and filter by category and search term.
- **Test Case 3.2**: User can sort products by name, price, and popularity.
- **Test Case 3.3**: User can add/remove an item from their wishlist, and the state persists.
- **Test Case 3.4**: User can add an item to the shopping cart.
- **Test Case 3.5**: In the cart, a user can update item quantity, remove an item, and move an item to "Saved for Later".
- **Test Case 3.6**: User can move an item from "Saved for Later" back to the active cart.
- **Test Case 3.7**: User can complete the checkout flow: select an address, fill mock payment details, and place an order.
- **Test Case 3.8**: After checkout, user is redirected to an order confirmation page with correct order details.
- **Test Case 3.9**: User can view their complete order history on their profile page.
- **Test Case 3.10**: Logged-in user can submit a review (rating and comment) for a product.

---
## 4. Job Marketplace Flow

- **Test Case 4.1**: A logged-in user can create a new job posting with a title, description, category, optional compensation, and images.
- **Test Case 4.2**: User can mark a new job as "Urgent", and it appears with the corresponding badge.
- **Test Case 4.3**: A different user can view the job listing and accept it.
- **Test Case 4.4**: Once a job is accepted, both the creator and acceptor can communicate via the job's chat page.
- **Test Case 4.5**: The job creator can mark the accepted job as "Completed".
- **Test Case 4.6**: After completion, both users can leave a review and rating for each other.
- **Test Case 4.7**: A user can save a job to their watchlist and view it on their "Saved Jobs" profile page.
- **Test Case 4.8**: If a job expires, the creator sees a "Relist" button which pre-fills the creation form.
- **Test Case 4.9**: User receives in-app notifications for job acceptance, new messages, and job completion.
