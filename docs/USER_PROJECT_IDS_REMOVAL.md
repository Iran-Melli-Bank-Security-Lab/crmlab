# User `projectIds` removal

Project membership is resolved from the `projectusers` (`ProjectAssignment`)
collection and canonical project responsibility fields. The User document is no
longer read or updated for project membership.

## Safe cleanup

1. Back up the users collection and deploy the normalized membership code.
2. Run the read-only report:

   ```bash
   npm --workspace enterprise-dashboard-backend run cleanup:user-project-ids
   ```

3. Review `affectedUsers`, then remove the obsolete field explicitly:

   ```bash
   npm --workspace enterprise-dashboard-backend run cleanup:user-project-ids -- --apply
   ```

The cleanup is not executed during application startup. It is idempotent, and
leaving the legacy field in old documents temporarily is harmless because the
application no longer selects or uses it.
