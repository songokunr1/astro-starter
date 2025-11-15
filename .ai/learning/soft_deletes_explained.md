# Why Soft Deletes Are a Best Practice

This document explains the concept of "soft deletion" and why it's a valuable, professional practice for building robust applications.

---

### **What is Soft Delete?**

*   **Hard Delete (The Default):** When you run a `DELETE FROM ...` SQL command, the row is physically removed from the database forever. It's gone, and recovery is extremely difficult.

*   **Soft Delete (Our Approach):** When a user "deletes" an item, we don't actually run a `DELETE` command. Instead, we run an `UPDATE` command to set a special flag on that row—in our case, setting the `deleted_at` column from `NULL` to the current timestamp. The data is still physically present in the database, but it's marked as "deleted" and hidden from normal application views.

It's the difference between moving a file to the Recycle Bin (`soft delete`) versus permanently shredding it (`hard delete`).

---

### **The Benefits: Why We Go Through the Trouble**

Here are the critical business and technical reasons why this is a best practice for many applications.

#### **1. User Data Recovery (The "Oops!" Button)**

This is the most direct and important user-facing benefit.

*   **Scenario:** A user spends hours creating a large, important set of flashcards and then accidentally clicks the delete button.
*   **With Hard Delete:** Their data is gone forever. You would have to tell a very unhappy user there is nothing you can do, short of restoring the entire database from a backup (which is a massive, disruptive operation).
*   **With Soft Delete:** You can easily build an "Undelete" or "Restore from Trash" feature. The data is still in the database, marked with a deletion timestamp. An "undelete" operation is just another simple `UPDATE` command that sets `deleted_at` back to `NULL`.

#### **2. Audit Trails and History**

For security, customer support, and debugging, you often need to know *what happened* and *when*.

*   **Scenario:** A user contacts support claiming, "My flashcard set disappeared, I never deleted it!"
*   **With Hard Delete:** You have no record. You can't tell if it was a bug, an accident, or something else. You have no proof.
*   **With Soft Delete:** You can look at the `deleted_at` timestamp and tell them, "Our records show this set was deleted on November 2nd at 1:30 PM from this IP address." This is invaluable for troubleshooting and maintaining a history of actions.

#### **3. Preserving Referential Integrity (Avoiding a Domino Effect)**

This is a huge technical reason that prevents database corruption. In a complex application, data is interconnected.

*   **Scenario:** Imagine in the future, we add a feature where users can purchase pre-made flashcard sets. A user deletes their account. What happens to the invoice for a set they purchased?
*   **With Hard Delete:** If you `DELETE` the user, you would either have to `DELETE` all their invoices (losing financial records, which is bad!) or the `DELETE` would fail because the `invoices` table has a foreign key pointing to the user. This creates a chain reaction of problems and can lead to orphaned data.
*   **With Soft Delete:** You simply mark the user as "deleted". Their `user` row still exists, so all the connections to their invoices, comments, and other activities remain intact. The user is gone from the UI, but your database's integrity is preserved.

#### **4. Analytics and Business Intelligence**

You often want to analyze data that includes "deleted" items to understand user behavior better.

*   **Scenario:** As the app owner, you want to know, "How many flashcard sets were created last month?"
*   **With Hard Delete:** You only know how many *currently exist*. You have no idea how many were created and then deleted (a "churn" metric), which could hide important user behavior patterns.
*   **With Soft Delete:** You can easily run two different queries:
    *   `SELECT count(*) FROM flashcard_sets WHERE created_at > ...` (Total created)
    *   `SELECT count(*) FROM flashcard_sets WHERE created_at > ... AND deleted_at IS NULL` (Total *active*)
    This gives you much richer data for making business decisions.

### **Python/Django Analogy**

This is a very common pattern in the Python world. In a framework like Django, you would implement this by creating a custom model manager that automatically filters out deleted items in every query, while still providing a way to access all items (including deleted ones) if needed for admin purposes. Our `SELECT` RLS policy acts as this automatic filter at the database level, which is even more secure and efficient.



