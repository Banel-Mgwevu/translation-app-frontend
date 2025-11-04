# Document Translator Frontend

A De Stijl-inspired frontend for the Document Translation API built with React + Vite.

## Features

- 🎨 De Stijl design aesthetic (primary colors, geometric shapes, bold lines)
- 📄 Upload DOCX documents
- 🌐 Select source and target languages
- 📥 Download translated documents
- 📊 Real-time document status tracking
- 📱 Responsive design

## Quick Start

1. **Install dependencies:**
   ```bash
   cd doc-translate-frontend
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open in browser:**
   ```
   http://localhost:5173
   ```

## Prerequisites

Make sure the backend API is running on `http://localhost:8000`:

```bash
# In the backend directory
python api.py
```

## Design Philosophy

This frontend is inspired by De Stijl (Dutch for "The Style"), an art movement founded by Piet Mondrian:

- **Primary Colors**: Red (#E01E1E), Blue (#0056A8), Yellow (#FFC800)
- **Neutral Colors**: Black and White
- **Grid-based Layout**: Strong horizontal and vertical lines
- **Geometric Shapes**: Rectangles and squares
- **Typography**: Bold, uppercase, sans-serif fonts
- **Asymmetric Balance**: Dynamic composition

## API Integration

The frontend connects to these API endpoints:

- `POST /upload` - Upload document
- `POST /translate` - Translate document
- `GET /download/{doc_id}` - Download file
- `GET /documents` - List all documents

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
