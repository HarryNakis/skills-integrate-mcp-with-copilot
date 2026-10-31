# Mergington High School Activities API

A super simple FastAPI application that allows students to view and sign up for extracurricular activities.

## Features

- View all available extracurricular activities
- Teacher-only sign-up and unregister actions
- Public activity and participant lists
- Expiring teacher sign-in sessions

## Getting Started

1. Install the dependencies:

   ```
   pip install fastapi uvicorn
   ```

2. Run the application:

   ```
   python app.py
   ```

3. Open your browser and go to:
   - API documentation: http://localhost:8000/docs
   - Alternative documentation: http://localhost:8000/redoc

## API Endpoints

| Method | Endpoint                                                          | Description                                                         |
| ------ | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| GET    | `/activities`                                                     | Get all activities with their details and current participant count |
| POST   | `/auth/login`                                                      | Sign in as a teacher and receive a bearer token                     |
| POST   | `/auth/logout`                                                     | Revoke the current teacher session                                  |
| POST   | `/activities/{activity_name}/signup?email=student@mergington.edu` | Sign up for an activity (teacher bearer token required)             |
| DELETE | `/activities/{activity_name}/unregister?email=student@mergington.edu` | Unregister a student (teacher bearer token required)             |

## Teacher accounts

Teacher credentials are read from `src/teachers.json`, which is ignored by git. Create a password hash without putting the password in shell history:

```sh
python -c 'import getpass, hashlib, secrets; password=getpass.getpass("Teacher password: "); salt=secrets.token_hex(16); iterations=600000; digest=hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), iterations).hex(); print(f"pbkdf2_sha256${iterations}${salt}${digest}")'
```

Create `src/teachers.json` with the generated hash:

```json
{
   "teachers": {
      "teacher-username": "pbkdf2_sha256$600000$replace-with-salt$replace-with-hash"
   }
}
```

The example hash above is a placeholder; replace it with the command output. Teacher sessions expire after one hour and are held in memory, so a server restart signs out all teachers. Keep the credentials file private and use HTTPS when exposing the app beyond a trusted local environment.

## Data Model

The application uses a simple data model with meaningful identifiers:

1. **Activities** - Uses activity name as identifier:

   - Description
   - Schedule
   - Maximum number of participants allowed
   - List of student emails who are signed up

2. **Students** - Uses email as identifier:
   - Name
   - Grade level

All data is stored in memory, which means data will be reset when the server restarts.
