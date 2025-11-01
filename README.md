# AI Flashcards

## Table of Contents

- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

## Project Description

AI Flashcards is an application designed to streamline the educational process by automating the creation of flashcards. It addresses the time-consuming nature of manual flashcard preparation by leveraging Artificial Intelligence to generate learning materials from user-provided text. The Minimum Viable Product (MVP) focuses on core functionalities, including AI-driven and manual flashcard creation, set management, a simple user account system, and integration with a spaced repetition algorithm to enhance the learning experience.

## Tech Stack

The project is built with a modern tech stack to ensure performance, scalability, and a great developer experience.

-   **Frontend**:
    -   [Astro 5](https://astro.build/) for building fast, content-driven websites.
    -   [React 19](https://react.dev/) for creating interactive UI components.
    -   [TypeScript 5](https://www.typescriptlang.org/) for static typing.
    -   [Tailwind CSS 4](https://tailwindcss.com/) for utility-first styling.
    -   [Shadcn/ui](https://ui.shadcn.com/) for accessible and reusable components.
-   **Backend**:
    -   [Supabase](https://supabase.io/) as a Backend-as-a-Service (BaaS), providing a PostgreSQL database, authentication, and auto-generated APIs.
-   **Artificial Intelligence**:
    -   [OpenRouter.ai](https://openrouter.ai/) to integrate with a variety of large language models for flashcard generation.
-   **DevOps**:
    -   [GitHub Actions](https://github.com/features/actions) for CI/CD pipelines.
    -   [DigitalOcean](https://www.digitalocean.com/) for application hosting via Docker.

## Getting Started Locally

To run the project locally, follow these steps.

### Prerequisites

-   Node.js `22.14.0` (as specified in the `.nvmrc` file).
-   A package manager like `npm`, `yarn`, or `pnpm`.

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/ai-flashcards.git
    cd ai-flashcards
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Set up environment variables:**

    Create a `.env` file in the root of the project and add the necessary environment variables for Supabase and OpenRouter.

    ```env
    # Supabase
    PUBLIC_SUPABASE_URL=your-supabase-url
    PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

    # OpenRouter
    OPENROUTER_API_KEY=your-openrouter-api-key
    ```

4.  **Run the development server:**

    ```bash
    npm run dev
    ```

    The application will be available at `http://localhost:4321`.

## Available Scripts

The following scripts are available in the `package.json`:

-   `npm run dev`: Starts the development server.
-   `npm run build`: Builds the application for production.
-   `npm run preview`: Previews the production build locally.
-   `npm run lint`: Lints the codebase for errors.
-   `npm run lint:fix`: Lints the codebase and automatically fixes issues.
-   `npm run format`: Formats the code using Prettier.

## Project Scope

### Key Features (MVP)

-   **FW-001**: AI-powered flashcard generation from user-provided text.
-   **FW-002**: Manual creation, editing, and deletion of flashcards.
-   **FW-003**: Browsing and viewing flashcard sets.
-   **FW-004**: Simple user authentication (registration, login).
-   **FW-005**: Integration with a third-party spaced repetition algorithm.
-   **FW-006**: Ability to accept or reject an entire AI-generated flashcard set.
-   **FW-007**: Feedback system (thumbs up/down) for individual AI-generated flashcards.
-   **FW-008**: Automatic splitting of long texts into multiple cards.

### Future Features (Out of Scope for MVP)

-   Development of a proprietary, advanced spaced repetition algorithm.
-   Importing materials from various file formats (PDF, DOCX).
-   Social features, such as sharing flashcard sets between users.
-   Integrations with external educational platforms.
-   Dedicated mobile applications for iOS and Android.

## Project Status

**In Development**: The project is currently under active development, with a focus on delivering the MVP features.

## License

This project is licensed under the **MIT License**. See the `LICENSE` file for more details.
