> write whole flow how we are able to perform change -> prepare migration -> apply migration in supabase.
> put it into  .ai/learning/supabase/<some_file_name>.md
> explain, use it as a teaching mechanism. where you will be teacher and you wish to explain flow HLD and execution and good practice explanation, automate procedure as possible. in the top put my prompt and under quick guide that will be all steps needed.

# A Teacher's Guide to Database Migrations with Supabase

This document explains the professional workflow for managing database changes. We'll use our recent experience fixing the Row-Level Security (RLS) policies as a real-world example.

---

### **Quick Guide: The Commands**

Here are the essential commands for the workflow.

1.  **Create a new migration file:**
    ```bash
    npx supabase migration new <descriptive_name_in_snake_case>
    ```

2.  **Apply migrations to your local database:**
    *   **Non-Destructive (Best for daily use):** Applies only new, un-run migrations.
        ```bash
        npx supabase migration up
        ```
    *   **Destructive (For a clean slate):** Wipes all data and re-runs all migrations from the beginning.
        ```bash
        npx supabase db reset
        ```

---

### **Part 1: The "Why" - Why Not Just Use the Supabase UI?**

As a developer, your primary goal is to create a project that is **reliable, repeatable, and maintainable**. Manually clicking around in a UI is the opposite of that.

Imagine you manually fix a policy in your local Supabase Studio. What happens when:
*   A new developer joins your team? How do they get that same fix?
*   You need to set up a "staging" server to test before production? How do you ensure it has the exact same schema?
*   You accidentally break your local database and need to rebuild it? You have to remember every manual change you ever made.

This is why we use a **migration system**.

**The Core Idea:** A migration is a file containing SQL code that represents a single change to your database. These files are like Git commits for your database schema. They live in your project repository, are version-controlled, and can be executed automatically. This practice is called **Infrastructure as Code**.

---

### **Part 2: The "How" - Our Migration Workflow in Practice**

Let's break down the professional workflow we just followed to fix the soft-delete issue.

#### **Step 1: Diagnose the Problem & Plan the Change**

*   **Problem:** Our `DELETE` API call was failing with a `500` error because of an RLS policy violation.
*   **Action:** We used diagnostic SQL queries to inspect the database's internal state (`pg_policies`). We didn't guess; we asked the database for the truth.
*   **Plan:** We determined that the `UPDATE` policy was being checked incorrectly during a soft delete. We planned to fix this by adding an explicit `WITH CHECK` clause.

**Good Practice:** Always understand the root cause before you start changing things. A "read-only" diagnosis is the safest first step.

#### **Step 2: Create a Migration File**

This is where we formally start a "commit" for our database change.

*   **Action:** We ran `npx supabase migration new fix_update_rls_with_check`.
*   **Result:** The Supabase CLI created a new file with a timestamp in its name (e.g., `20251102123308_fix_update_rls_with_check.sql`) inside the `supabase/migrations/` folder. The timestamp is crucial because it tells Supabase the exact order to run the migrations in.

#### **Step 3: Write the SQL Code**

This is where we implement our planned fix.

*   **Action:** We wrote the SQL commands (`DROP POLICY ...`, `CREATE POLICY ...`) into the new file.
*   **Good Practice (Idempotency):** We learned to make our scripts "idempotent" (safe to run multiple times). For example, using `DROP POLICY IF EXISTS ...` prevents an error if the policy was already deleted. This makes the migration system much more robust.

#### **Step 4: Apply the Migration Locally**

This is where we execute the change on our local Docker database.

*   **Action:** We ran `npx supabase migration up`.
*   **What it does:** The CLI connects to the local database, checks which migrations in the `supabase/migrations` folder it hasn't run yet, and executes only the new ones. It's smart, targeted, and **non-destructive**. It's the command you will use most often.

#### **Step 5: Update the Documentation**

Code and documentation must always stay in sync.

*   **Action:** We updated `.ai/db-plan.md` to reflect the final, correct RLS policy.
*   **Result:** Now, if a new developer reads the `db-plan.md`, they see the reality of what's in the database schema.

---

### **Part 3: The Big Payoff - Automation & The "Fresh Start"**

You now have a powerful, automated system.

Imagine your local database gets completely corrupted. Or a new developer joins the team. The process to get a perfect, working database is now simple and automated:

1.  `git clone <your-repo>`
2.  `npx supabase start` (Starts the Docker containers)
3.  `npx supabase db reset`

The `db reset` command will automatically wipe the database and then run **every single migration file** in your `migrations` folder in chronological order, building a perfect, up-to-date schema from scratch.

This is the power of managing your database as code. It's the difference between a fragile, manual setup and a professional, automated development environment.



