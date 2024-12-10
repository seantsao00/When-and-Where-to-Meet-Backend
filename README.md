# When-and-Where-to-Meet Backend

This repository contains the backend for the "When-and-Where-to-Meet" application.

## Prerequisites

Ensure you have the following installed and configured on your system:

- **Node.js**: Required for running the backend.
- **PostgreSQL**: Required for managing the database.

You also need access permissions to create and delete databases in PostgreSQL.

## Environment Setup

1. **Install Necessary Packages**
   
   Run the following command to install the required dependencies:
   ```bash
   npm ci
   ```

2. **Set Up Environment Variables**

   Create a `.env` file in the root directory and configure the following environment variables:
   ```env
   PGUSER='postgres'
   PGPASSWORD='{Your_Password}'
   PGDATABASE='{Database_name}'
   ```
   **Note**: The `PGDATABASE` value will be overwritten if the specified database already exists.

3. **Restore the Database**

   Run the following command to build and restore the database:
   ```bash
   npm run build-db
   ```

4. **Run the Backend**

   Start the backend server by running:
   ```bash
   npm run dev
   ```

## Additional Notes

- Ensure your PostgreSQL service is running before attempting to build or run the application.
- Use environment variables to securely store sensitive information like passwords and database names.
- The name of database must be consist of a string which only contains lowercase letters.

For further details, refer to the project documentation or contact the repository maintainers.

