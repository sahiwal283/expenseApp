# Credentials Folder

⚠️ **SENSITIVE FILES - DO NOT COMMIT TO PUBLIC REPOS**

This folder contains sensitive credentials, API keys, OAuth tokens, and other confidential information.

## Security

- This folder is excluded from git via `.gitignore`
- Never commit these files to version control
- Keep backups in a secure location (password manager, encrypted storage)
- Rotate credentials regularly

## Files

### Production Credentials

- `BOOMIN_CREDENTIALS.md` - Boomin Brands Zoho Books API credentials
- `HAUTE_CREDENTIALS.md` - Haute Brands Zoho Books API credentials

### Template

See `CREDENTIALS_TEMPLATE.md` for the standard format when adding new entities.

## Adding New Credentials

1. Copy `CREDENTIALS_TEMPLATE.md`
2. Rename to `{ENTITY_NAME}_CREDENTIALS.md`
3. Fill in all required fields
4. Store backup in secure location
5. Update entity configuration in backend

## Access Control

Only the following roles should have access to these files:
- **Admin** - Full access to all credentials
- **Developer** - Access for deployment and troubleshooting
- **Accountant** - Read-only access for Zoho Books integration verification

---

**Last Updated**: October 14, 2025  
**Maintained By**: System Administrator

