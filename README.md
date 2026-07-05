# PoolCool - Heat Wave Refuge Network

PoolCool is a community-driven web application designed to help people find and share cool spaces during extreme heat waves. Whether you are looking for a public refuge like a library or a private host offering their air-conditioned living room, PoolCool provides an interactive map to discover nearby safe havens.

## 🌟 Key Features

- **Interactive Map:** Discover nearby cooling spaces on an interactive map powered by Leaflet.
- **Add Spaces:** Easily add new public or private spaces to the network.
- **Access Requests:** Users can request access to private spaces securely, and hosts can approve or reject these requests through a dedicated dashboard.
- **AI Space Analysis:** Upload photos of your space, and Gemini AI will analyze it to ask clarifying questions and estimate the effective cooling temperature drop.
- **Heatmap Mode:** Visualize the distribution of cooling spaces and temperature data.
- **Current Temperature:** Integration with Open-Meteo API to display the current standard and effective temperatures based on user location.

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS & shadcn/ui
- **Map:** Leaflet & react-leaflet
- **Database & Auth:** Supabase
- **AI Integration:** Google Gemini API (`@google/genai`)
- **Animations:** Motion (Framer Motion)

## 🚀 Getting Started

### Prerequisites

Ensure you have Node.js and npm installed. You will also need a Supabase project and a Gemini API key.

### Environment Variables

Create a `.env` file in the root directory and add the following variables as defined in `.env.example`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key
```

### Database Setup

Run the SQL queries found in `supabase_schema.sql` in your Supabase SQL editor to create the necessary tables and Row Level Security (RLS) policies.

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📝 License

This project is licensed under the MIT License.
