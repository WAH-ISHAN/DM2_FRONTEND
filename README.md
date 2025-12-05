# DM2_FRONTEND (Data Management II Project)

This repository contains the frontend client for my Data Management II university assignment. It is a modern, responsive web application built to interact with the [DM2_BACKEND](https://github.com/WAH-ISHAN/DM2_BACKEND) API.

## 🚀 Features

* **Modern Tech Stack:** Built with **React** and **TypeScript** for a robust and scalable architecture.
* **Fast Build Tooling:** Powered by **Vite** for lightning-fast development and HMR (Hot Module Replacement).
* **Responsive Design:** Styled with **Tailwind CSS** to ensure a mobile-friendly and professional UI.
* **API Integration:** seamlessly connects to the backend REST API for data operations.

## 🛠️ Tech Stack

* **Framework:** React (TypeScript)
* **Build Tool:** Vite
* **Styling:** Tailwind CSS + PostCSS
* **Linting:** ESLint

## 📂 Project Structure

```text
DM2_FRONTEND/
├── public/           # Static assets
├── src/              # Source code
│   ├── components/   # Reusable UI components
│   ├── pages/        # Page views
│   ├── services/     # API service calls (Axios/Fetch)
│   ├── App.tsx       # Main application component
│   └── main.tsx      # Entry point
├── .env              # Environment variables
├── tailwind.config.js # Tailwind configuration
└── vite.config.js    # Vite configuration
⚙️ Installation & Setup
Clone the repository:

Bash

git clone [https://github.com/WAH-ISHAN/DM2_FRONTEND.git](https://github.com/WAH-ISHAN/DM2_FRONTEND.git)
cd DM2_FRONTEND
Install dependencies:

Bash

npm install
Configure Environment Variables: Create a .env file in the root directory (if not already present) and add your backend URL:

Code snippet

VITE_API_BASE_URL=http://localhost:3000/api
Run the development server:

Bash

npm run dev
The app should now be running at http://localhost:5173.

📦 Build for Production
To create a production-ready build:

Bash

npm run build
