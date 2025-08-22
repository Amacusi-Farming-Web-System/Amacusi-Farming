
# 🌾 Amacusi Farming – E-commerce Web Application

[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Backend: Firebase](https://img.shields.io/badge/Backend-Firebase-orange.svg?logo=firebase)](https://firebase.google.com/)
[![Frontend: HTML5](https://img.shields.io/badge/Frontend-HTML5-red.svg?logo=html5)](https://developer.mozilla.org/docs/Web/Guide/HTML/HTML5)
[![Styles: CSS3](https://img.shields.io/badge/Styles-CSS3-blue.svg?logo=css3&logoColor=white)](https://developer.mozilla.org/docs/Web/CSS)
[![Language: JavaScript](https://img.shields.io/badge/Language-JavaScript-yellow.svg?logo=javascript)](https://developer.mozilla.org/docs/Web/JavaScript)
[![Charts: Chart.js](https://img.shields.io/badge/Charts-Chart.js-purple.svg?logo=chartdotjs)](https://www.chartjs.org/)
[![PDF: jsPDF](https://img.shields.io/badge/PDF-jsPDF-lightgrey.svg)](https://github.com/parallax/jsPDF)
[![Icons: Font Awesome](https://img.shields.io/badge/Icons-Font%20Awesome-339AF0.svg?logo=fontawesome)](https://fontawesome.com/)
[![Fonts: Google Fonts](https://img.shields.io/badge/Fonts-Google%20Fonts-ff69b4.svg?logo=googlefonts)](https://fonts.google.com/)
[![Project Status](https://img.shields.io/badge/Status-Active-success.svg)](#)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen.svg)](#-contributing)



# Amacusi Farming - E-commerce Web Application

Amacusi Farming is a comprehensive e-commerce platform for a South African agricultural business specializing in farm-fresh meat and egg products. This web application provides customers with an intuitive shopping experience while offering administrators powerful tools to manage products, orders, and business analytics.

## 🌟 Features

### Customer-Facing Features

- **Product Catalog**: Browse and filter products by category (Poultry, Beef, Pork, Eggs)
- **Shopping Cart**: Add/remove items, quantity management, and order summary
- **User Authentication**: Secure Google Sign-In integration
- **Order Management**: Complete checkout process with address and payment options
- **User Profiles**: Order history, account settings, and address management
- **Responsive Design**: Mobile-friendly interface across all devices

### Admin Features

- **Dashboard**: Overview of business metrics and statistics
- **Product Management**: Add, edit, and manage product inventory
- **Order Management**: Process orders, update statuses, and track deliveries
- **Reporting System**: Comprehensive sales, payment, product, and customer analytics
- **User Management**: Customer information and order history access

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase (Firestore Database, Authentication, Storage)
- **Charts & Visualization**: Chart.js
- **Icons**: Font Awesome
- **PDF Export**: jsPDF with AutoTable
- **Fonts**: Google Fonts (Poppins, Open Sans, Inter)

## 📁 Project Structure

```text
amacusi-farming/
├── Images/                   # Product images and logos
├── Pages/                    # Main application pages
│   ├── about.html            # About us page
│   ├── cart.html             # Shopping cart
│   ├── Products.html         # Product catalog
│   ├── profile.html          # User profile
│   ├── signUp.html           # Authentication
│   └── admin/                # Admin panel
│       ├── admin.html        # Admin dashboard
│       ├── orders.html       # Order management
│       └── reports.html      # Analytics reports
├── css/                      # Stylesheets
├── scripts/                  # Client-side JavaScript
├── logInScripts/             # Authentication scripts
└── productsScripts/          # Product-related functionality
