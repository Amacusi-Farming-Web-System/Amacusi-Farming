# 🌾 Amacusi Farming – E-commerce Web Application

[![📜 MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![🔥 Firebase](https://img.shields.io/badge/Backend-Firebase-orange.svg?logo=firebase)](https://firebase.google.com/)
[![🌐 HTML5](https://img.shields.io/badge/Frontend-HTML5-red.svg?logo=html5)](https://developer.mozilla.org/docs/Web/Guide/HTML/HTML5)
[![🎨 CSS3](https://img.shields.io/badge/Styles-CSS3-blue.svg?logo=css3&logoColor=white)](https://developer.mozilla.org/docs/Web/CSS)
[![⚡ JavaScript](https://img.shields.io/badge/Language-JavaScript-yellow.svg?logo=javascript)](https://developer.mozilla.org/docs/Web/JavaScript)
[![📊 Chart.js](https://img.shields.io/badge/Charts-Chart.js-purple.svg?logo=chartdotjs)](https://www.chartjs.org/)
[![📄 jsPDF](https://img.shields.io/badge/PDF-jsPDF-lightgrey.svg)](https://github.com/parallax/jsPDF)
[![🎭 Font Awesome](https://img.shields.io/badge/Icons-Font%20Awesome-339AF0.svg?logo=fontawesome)](https://fontawesome.com/)
[![🔤 Google Fonts](https://img.shields.io/badge/Fonts-Google%20Fonts-ff69b4.svg?logo=googlefonts)](https://fonts.google.com/)
[![🚀 Status](https://img.shields.io/badge/Status-Active-success.svg)](#)
[![🙌 PRs](https://img.shields.io/badge/PRs-Welcome-brightgreen.svg)](#-contributing)

Amacusi Farming is a comprehensive **e-commerce platform** for a 🇿🇦 South African agricultural business 🐄🐓🥚 specializing in **farm-fresh meat and egg products**.  
It delivers an intuitive shopping experience 🛒 for customers and powerful admin tools 📊 for managing products, orders, and analytics.

---
## 🚀 Live Demo  
👉 Visit the project here: [🌐 Amacusi Farming Website](https://amacusi-farming-web-system.github.io/Amacusi-Farming/) 
## To view the Admin Side
👉 Access The Admin side here: [🌐 Amacusi Farming Admin](https://amacusi-farming-web-system.github.io/Amacusi-Farming/admin/admin.html) 


---

## 🧭 Table of Contents
- 🌟 [Features](#-features)  
- 🛠️ [Technology Stack](#%EF%B8%8F-technology-stack)  
- 📁 [Project Structure](#-project-structure)  
- 🚀 [Getting Started](#-getting-started)  
- 🔑 [Firebase Configuration](#-firebase-configuration)  
- 📊 [Admin Access](#-admin-access)  
- 🎨 [Design Features](#-design-features)  
- 🔒 [Security Features](#-security-features)  
- 📈 [Reporting & Analytics](#-reporting--analytics)  
- 🌐 [Browser Support](#-browser-support)  
- 🤝 [Contributing](#-contributing)  
- 📝 [License](#-license)  
- 🏢 [About Amacusi Farming](#-about-amacusi-farming)  
- 📞 [Support](#-support)  

---

## 🌟 Features

### 👩‍💻 Customer-Facing
- 🛍️ **Product Catalog**: Browse & filter by category (Poultry, Beef, Pork, Eggs)  
- 🛒 **Shopping Cart**: Add/remove items, adjust quantities, view order summary  
- 🔐 **User Authentication**: Secure Google Sign-In  
- 💳 **Order Management**: Checkout with address & payment options  
- 👤 **User Profiles**: Order history, settings & addresses  
- 📱 **Responsive Design**: Works across all devices  

### 🛡️ Admin
- 📊 **Dashboard**: Key business metrics & stats  
- 📦 **Product Management**: Add, edit & manage inventory  
- 📋 **Order Management**: Process, update & track deliveries  
- 📑 **Reporting**: Sales, payments, products & customers analytics  
- 👥 **User Management**: Access customer data & order history  

---

## 🛠️ Technology Stack
- 🌐 **Frontend**: HTML5, CSS3, JavaScript (ES6+)  
- 🔥 **Backend**: Firebase (Firestore DB, Authentication, Storage)  
- 📊 **Charts**: Chart.js  
- 🎭 **Icons**: Font Awesome  
- 📄 **PDF Export**: jsPDF + AutoTable  
- 🔤 **Fonts**: Google Fonts (Poppins, Open Sans, Inter)  

---

## 📁 Project Structure

```text
amacusi-farming/
├── Images/                   # 🖼️ Product images & logos
├── Pages/                    # 📄 Main application pages
│   ├── about.html            # ℹ️ About us page
│   ├── cart.html             # 🛒 Shopping cart
│   ├── Products.html         # 🛍️ Product catalog
│   ├── profile.html          # 👤 User profile
│   ├── signUp.html           # 🔐 Authentication
│   └── admin/                # 🛡️ Admin panel
│       ├── admin.html        # 📊 Admin dashboard
│       ├── orders.html       # 📋 Order management
│       └── reports.html      # 📑 Analytics reports
├── css/                      # 🎨 Stylesheets
├── scripts/                  # ⚡ Client-side JavaScript
├── logInScripts/             # 🔐 Authentication scripts
└── productsScripts/          # 🛍️ Product logic
