"""
Django settings for core project.
"""

from pathlib import Path
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# ============ SECURITY ============
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-_+p(%x1fg8#0w6na==8m&pct23tg-&(!aig=c-1@gl%of)&)!d')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', 'True') == 'True'

ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    '.onrender.com',
    '.vercel.app',
    'render.com',
    '.railway.app',  # ⭐ Railway domain ke liye
    'virtual-backend.up.railway.app',
    'virtual-internship-portal-production.up.railway.app',
]

# ============ CSRF TRUSTED ORIGINS ============
CSRF_TRUSTED_ORIGINS = [
    'https://virtual-backend.up.railway.app',
    'https://virtual-internship-portal-production.up.railway.app',
    'https://virtual-internship-portal.vercel.app',
]


# ============ APPLICATION DEFINITION ============
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # DRF
    'rest_framework',

    # Apps
    'users',

    # CORS
    'corsheaders',
]


MIDDLEWARE = [
    # IMPORTANT: CORS middleware must be at the top
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]


ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'


# ============ DATABASE SETTINGS ============
# MongoDB ke liye dummy database (kyunki hum PyMongo direct use kar rahe hain)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.dummy',
        'NAME': 'dummy',
    }
}

# MongoDB connection string from .env (PyMongo ke liye)
MONGO_URI = os.getenv('MONGO_URI')
DB_NAME = os.getenv('DB_NAME')


# ============ PASSWORD VALIDATION ============
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# ============ INTERNATIONALIZATION ============
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


# ============ STATIC & MEDIA FILES ============
STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')


# ============ CORS SETTINGS ============
# Development ke liye - sab allow (temporary)
CORS_ALLOW_ALL_ORIGINS = False  # ⭐ False karein

# Production ke liye - specific origins
CORS_ALLOWED_ORIGINS = [
    "https://virtual-internship-portal.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

CORS_ALLOW_CREDENTIALS = True

# CORS headers settings
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# ============ DEFAULT PRIMARY KEY FIELD ============
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# ============ JWT SETTINGS ============
JWT_SECRET = os.getenv('JWT_SECRET', 'your-jwt-secret-key')
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY', '')