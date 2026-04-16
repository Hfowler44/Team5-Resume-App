# Use Case Diagram

This diagram summarizes the main backend-supported user flows and the external services the system depends on.

## Diagram

```mermaid
flowchart LR
    guest[Guest]
    user[Authenticated User]
    smtp[SMTP Provider]
    ai[Gemini API]
    jobsrc[External Job Source]

    subgraph system[Resume App]
        register([Register Account])
        verify([Verify Email])
        resend([Resend Verification Email])
        login([Log In])
        forgot([Request Password Reset])
        reset([Reset Password])
        profile([View Profile])
        updateProfile([Update Profile])
        upload([Upload Resume PDF])
        viewResume([View Resume List and Details])
        downloadResume([View Stored Resume File])
        manageResume([Delete Resume])
        versions([View Resume Versions])
        versionFile([View Resume Version File])
        analyze([Analyze Resume])
        suggestions([View Resume Suggestions])
        rateSuggestion([Apply or Rate Suggestion])
        syncJobs([Sync Jobs])
        matchJobs([Match Resume to Jobs])
    end

    guest --> register
    guest --> verify
    guest --> resend
    guest --> login
    guest --> forgot
    guest --> reset

    user --> profile
    user --> updateProfile
    user --> upload
    user --> viewResume
    user --> downloadResume
    user --> manageResume
    user --> versions
    user --> versionFile
    user --> analyze
    user --> suggestions
    user --> rateSuggestion
    user --> syncJobs
    user --> matchJobs

    register --> smtp
    resend --> smtp
    forgot --> smtp
    analyze --> ai
    syncJobs --> jobsrc
```

## Scope Notes

- The diagram reflects implemented backend routes in `backend/api/routes`.
- `Sync Jobs` is currently protected by authentication, but there is no separate admin-only route in the current API.
- `Analyze Resume` depends on Gemini, while registration, verification, and password reset flows depend on SMTP email delivery.
- The Mongo schema defines an `applications` collection, but application submission and tracking are not exposed through the current API, so they are not shown as active use cases here.
