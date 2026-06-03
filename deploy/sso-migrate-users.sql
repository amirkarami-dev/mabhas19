-- =============================================================================
-- sso-migrate-users.sql
-- Copies ASP.NET Identity rows from the app DB → the IdP DB,
-- preserving all PKs, password hashes, and every Identity column.
--
-- WHEN TO RUN:
--   AFTER  the IdP (src/Auth) has started once and created Mabhas19AuthDb
--          (its EF Core migration runs on first boot and creates the AspNet* tables).
--   BEFORE production cutover (Step 4 of sso-cutover-runbook.md).
--
-- SAFE TO RE-RUN: every INSERT is guarded with WHERE NOT EXISTS — rows that
-- already exist in the target are silently skipped (idempotent).
--
-- DOES NOT:
--   • Touch OpenIddict tables (the IdP seeds clients/scopes itself on boot).
--   • Delete or modify any source rows in Mabhas19Db.
--   • Change Mabhas19Db schema in any way.
--
-- REQUIRES:
--   The SA account (or an account with db_datareader on Mabhas19Db and
--   db_datawriter on Mabhas19AuthDb) running this script on the same SQL Server
--   instance that hosts both databases.
--
-- USAGE (inside the sqlserver container):
--   sqlcmd -S localhost -U sa -P "<SA_PASSWORD>" -C -i /migrations/sso-migrate-users.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Configuration — change these two names if your DB names differ.
-- ---------------------------------------------------------------------------
-- Source (app) database:  Mabhas19Db
-- Target (IdP)  database: Mabhas19AuthDb
-- ---------------------------------------------------------------------------

SET NOCOUNT ON;
SET XACT_ABORT ON;

PRINT '=== SSO user migration: Mabhas19Db → Mabhas19AuthDb ===';
PRINT 'Started: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT '';

-- ---------------------------------------------------------------------------
-- 1. AspNetRoles
--    Must go first — AspNetUserRoles and AspNetRoleClaims FK into this table.
-- ---------------------------------------------------------------------------
PRINT 'Step 1/7: AspNetRoles ...';

INSERT INTO Mabhas19AuthDb.dbo.AspNetRoles
    (Id, Name, NormalizedName, ConcurrencyStamp)
SELECT
    src.Id,
    src.Name,
    src.NormalizedName,
    src.ConcurrencyStamp
FROM Mabhas19Db.dbo.AspNetRoles AS src
WHERE NOT EXISTS (
    SELECT 1
    FROM Mabhas19AuthDb.dbo.AspNetRoles AS tgt
    WHERE tgt.Id = src.Id
);

PRINT '  Inserted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' role row(s).';

-- ---------------------------------------------------------------------------
-- 2. AspNetUsers
--    Must go before every table that FKs into AspNetUsers.
--    All Identity columns are copied verbatim so:
--      • PasswordHash → existing passwords keep working (same hasher).
--      • SecurityStamp / ConcurrencyStamp → token validation unchanged.
--      • NormalizedEmail / NormalizedUserName → look-up indexes work.
--      • PhoneNumber / PhoneNumberConfirmed → OTP flows work.
--      • Id preserved → Project.OwnerId / Subscription.UserId still resolve.
-- ---------------------------------------------------------------------------
PRINT 'Step 2/7: AspNetUsers ...';

INSERT INTO Mabhas19AuthDb.dbo.AspNetUsers
    (Id,
     UserName,
     NormalizedUserName,
     Email,
     NormalizedEmail,
     EmailConfirmed,
     PasswordHash,
     SecurityStamp,
     ConcurrencyStamp,
     PhoneNumber,
     PhoneNumberConfirmed,
     TwoFactorEnabled,
     LockoutEnd,
     LockoutEnabled,
     AccessFailedCount)
SELECT
    src.Id,
    src.UserName,
    src.NormalizedUserName,
    src.Email,
    src.NormalizedEmail,
    src.EmailConfirmed,
    src.PasswordHash,
    src.SecurityStamp,
    src.ConcurrencyStamp,
    src.PhoneNumber,
    src.PhoneNumberConfirmed,
    src.TwoFactorEnabled,
    src.LockoutEnd,
    src.LockoutEnabled,
    src.AccessFailedCount
FROM Mabhas19Db.dbo.AspNetUsers AS src
WHERE NOT EXISTS (
    SELECT 1
    FROM Mabhas19AuthDb.dbo.AspNetUsers AS tgt
    WHERE tgt.Id = src.Id
);

PRINT '  Inserted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' user row(s).';

-- ---------------------------------------------------------------------------
-- 3. AspNetRoleClaims
--    FKs: AspNetRoles.Id
-- ---------------------------------------------------------------------------
PRINT 'Step 3/7: AspNetRoleClaims ...';

INSERT INTO Mabhas19AuthDb.dbo.AspNetRoleClaims
    (Id, RoleId, ClaimType, ClaimValue)
SELECT
    src.Id,
    src.RoleId,
    src.ClaimType,
    src.ClaimValue
FROM Mabhas19Db.dbo.AspNetRoleClaims AS src
WHERE NOT EXISTS (
    SELECT 1
    FROM Mabhas19AuthDb.dbo.AspNetRoleClaims AS tgt
    WHERE tgt.Id = src.Id
);

PRINT '  Inserted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' role-claim row(s).';

-- ---------------------------------------------------------------------------
-- 4. AspNetUserClaims
--    FKs: AspNetUsers.Id
-- ---------------------------------------------------------------------------
PRINT 'Step 4/7: AspNetUserClaims ...';

INSERT INTO Mabhas19AuthDb.dbo.AspNetUserClaims
    (Id, UserId, ClaimType, ClaimValue)
SELECT
    src.Id,
    src.UserId,
    src.ClaimType,
    src.ClaimValue
FROM Mabhas19Db.dbo.AspNetUserClaims AS src
WHERE NOT EXISTS (
    SELECT 1
    FROM Mabhas19AuthDb.dbo.AspNetUserClaims AS tgt
    WHERE tgt.Id = src.Id
);

PRINT '  Inserted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' user-claim row(s).';

-- ---------------------------------------------------------------------------
-- 5. AspNetUserLogins
--    FKs: AspNetUsers.Id
--    Carries Google (and any other external provider) logins.
-- ---------------------------------------------------------------------------
PRINT 'Step 5/7: AspNetUserLogins ...';

INSERT INTO Mabhas19AuthDb.dbo.AspNetUserLogins
    (LoginProvider, ProviderKey, ProviderDisplayName, UserId)
SELECT
    src.LoginProvider,
    src.ProviderKey,
    src.ProviderDisplayName,
    src.UserId
FROM Mabhas19Db.dbo.AspNetUserLogins AS src
WHERE NOT EXISTS (
    SELECT 1
    FROM Mabhas19AuthDb.dbo.AspNetUserLogins AS tgt
    WHERE tgt.LoginProvider = src.LoginProvider
      AND tgt.ProviderKey   = src.ProviderKey
);

PRINT '  Inserted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' user-login row(s).';

-- ---------------------------------------------------------------------------
-- 6. AspNetUserRoles
--    FKs: AspNetUsers.Id + AspNetRoles.Id
-- ---------------------------------------------------------------------------
PRINT 'Step 6/7: AspNetUserRoles ...';

INSERT INTO Mabhas19AuthDb.dbo.AspNetUserRoles
    (UserId, RoleId)
SELECT
    src.UserId,
    src.RoleId
FROM Mabhas19Db.dbo.AspNetUserRoles AS src
WHERE NOT EXISTS (
    SELECT 1
    FROM Mabhas19AuthDb.dbo.AspNetUserRoles AS tgt
    WHERE tgt.UserId = src.UserId
      AND tgt.RoleId = src.RoleId
);

PRINT '  Inserted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' user-role row(s).';

-- ---------------------------------------------------------------------------
-- 7. AspNetUserTokens
--    FKs: AspNetUsers.Id
-- ---------------------------------------------------------------------------
PRINT 'Step 7/7: AspNetUserTokens ...';

INSERT INTO Mabhas19AuthDb.dbo.AspNetUserTokens
    (UserId, LoginProvider, Name, Value)
SELECT
    src.UserId,
    src.LoginProvider,
    src.Name,
    src.Value
FROM Mabhas19Db.dbo.AspNetUserTokens AS src
WHERE NOT EXISTS (
    SELECT 1
    FROM Mabhas19AuthDb.dbo.AspNetUserTokens AS tgt
    WHERE tgt.UserId        = src.UserId
      AND tgt.LoginProvider = src.LoginProvider
      AND tgt.Name          = src.Name
);

PRINT '  Inserted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' user-token row(s).';

-- ---------------------------------------------------------------------------
-- Verification — row-count parity per table (source vs target).
-- All "Delta" values should be 0 after a successful migration.
-- A positive delta means rows exist in the source that are not yet in the
-- target; a negative delta means the target has rows not in the source
-- (e.g. IdP-seeded admin user — acceptable).
-- ---------------------------------------------------------------------------
PRINT '';
PRINT '=== Verification: row-count comparison (source Mabhas19Db vs target Mabhas19AuthDb) ===';

SELECT
    'AspNetRoles' AS [Table],
    (SELECT COUNT(*) FROM Mabhas19Db.dbo.AspNetRoles)     AS [Source],
    (SELECT COUNT(*) FROM Mabhas19AuthDb.dbo.AspNetRoles) AS [Target],
    (SELECT COUNT(*) FROM Mabhas19Db.dbo.AspNetRoles) -
    (SELECT COUNT(*) FROM Mabhas19AuthDb.dbo.AspNetRoles) AS [Delta_SourceMinusTarget]
UNION ALL
SELECT
    'AspNetUsers',
    (SELECT COUNT(*) FROM Mabhas19Db.dbo.AspNetUsers),
    (SELECT COUNT(*) FROM Mabhas19AuthDb.dbo.AspNetUsers),
    (SELECT COUNT(*) FROM Mabhas19Db.dbo.AspNetUsers) -
    (SELECT COUNT(*) FROM Mabhas19AuthDb.dbo.AspNetUsers)
UNION ALL
SELECT
    'AspNetRoleClaims',
    (SELECT COUNT(*) FROM Mabhas19Db.dbo.AspNetRoleClaims),
    (SELECT COUNT(*) FROM Mabhas19AuthDb.dbo.AspNetRoleClaims),
    (SELECT COUNT(*) FROM Mabhas19Db.dbo.AspNetRoleClaims) -
    (SELECT COUNT(*) FROM Mabhas19AuthDb.dbo.AspNetRoleClaims)
UNION ALL
SELECT
    'AspNetUserClaims',
    (SELECT COUNT(*) FROM Mabhas19Db.dbo.AspNetUserClaims),
    (SELECT COUNT(*) FROM Mabhas19AuthDb.dbo.AspNetUserClaims),
    (SELECT COUNT(*) FROM Mabhas19Db.dbo.AspNetUserClaims) -
    (SELECT COUNT(*) FROM Mabhas19AuthDb.dbo.AspNetUserClaims)
UNION ALL
SELECT
    'AspNetUserLogins',
    (SELECT COUNT(*) FROM Mabhas19Db.dbo.AspNetUserLogins),
    (SELECT COUNT(*) FROM Mabhas19AuthDb.dbo.AspNetUserLogins),
    (SELECT COUNT(*) FROM Mabhas19Db.dbo.AspNetUserLogins) -
    (SELECT COUNT(*) FROM Mabhas19AuthDb.dbo.AspNetUserLogins)
UNION ALL
SELECT
    'AspNetUserRoles',
    (SELECT COUNT(*) FROM Mabhas19Db.dbo.AspNetUserRoles),
    (SELECT COUNT(*) FROM Mabhas19AuthDb.dbo.AspNetUserRoles),
    (SELECT COUNT(*) FROM Mabhas19Db.dbo.AspNetUserRoles) -
    (SELECT COUNT(*) FROM Mabhas19AuthDb.dbo.AspNetUserRoles)
UNION ALL
SELECT
    'AspNetUserTokens',
    (SELECT COUNT(*) FROM Mabhas19Db.dbo.AspNetUserTokens),
    (SELECT COUNT(*) FROM Mabhas19AuthDb.dbo.AspNetUserTokens),
    (SELECT COUNT(*) FROM Mabhas19Db.dbo.AspNetUserTokens) -
    (SELECT COUNT(*) FROM Mabhas19AuthDb.dbo.AspNetUserTokens);

PRINT '';
PRINT 'Done: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT 'Review the Delta column above. Delta > 0 means rows are missing from the target.';
PRINT 'Delta < 0 is normal for users seeded by the IdP itself (e.g. the admin seed).';
PRINT 'If Delta > 0, investigate and re-run this script.';
