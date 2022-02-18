module.exports = {
    timeout: 100,
    load: {
        before: ['responseTime', 'logger', 'cors', 'responses', 'gzip'],
        order: [
            "Define the middlewares' load order by putting their name in this array is the right order",
        ],
        after: ['parser', 'router'],
    },
    settings: {
        "crash-handler": {
            enabled: true
        },
        favicon: {
            path: "favicon.ico",
            maxAge: 86400000
        },
        public: {
            path: "./public",
            maxAge: 60000
        },
        language: {
            enabled: true,
            defaultLocale: "en_us",
            modes: [
                "query",
                "subdomain",
                "cookie",
                "header",
                "url",
                "tld"
            ],
            cookieName: "locale"
        },

        csrf: {
            "enabled": false,
            "key": "_csrf",
            "secret": "_csrfSecret"
        },
        csp: {
            "enabled": true,
            "policy": [
                "block-all-mixed-content"
            ]
        },
        p3p: {
            "enabled": true,
            "value": ""
        },
        hsts: {
            "enabled": true,
            "maxAge": 31536000,
            "includeSubDomains": true
        },
        xframe: {
            "enabled": true,
            "value": "SAMEORIGIN"
        },
        xss: {
            "enabled": true,
            "mode": "block"
        },
        cors: {
            enabled: true,
            origin: "*",
            expose: [
                "WWW-Authenticate",
                "Server-Authorization"
            ],
            maxAge: 31536000,
            credentials: true,
            methods: [
                "GET",
                "POST",
                "PUT",
                "PATCH",
                "DELETE",
                "OPTIONS",
                "HEAD"
            ],
            headers: [
                "Content-Type",
                "Authorization",
                "X-Frame-Options",
                "Origin"
            ]
        },
        ip: {
            "enabled": false,
            "whiteList": [],
            "blackList": []
        },

        session: {
            "enabled": true,
            "client": "cookie",
            "key": "strapi.sid",
            "prefix": "strapi:sess:",
            "secretKeys": ["mySecretKey1", "mySecretKey2"],
            "httpOnly": true,
            "maxAge": 86400000,
            "overwrite": true,
            "signed": false,
            "rolling": false
        },
        logger: {
            "level": "trace",
            "exposeInContext": true,
            "requests": true
        },
        parser: {
            "enabled": true,
            "multipart": true
        },
        gzip: {
            "enabled": false
        },
        responseTime: {
            "enabled": false
        },
        poweredBy: {
            "enabled": true,
            "value": "Strapi <strapi.io>"
        }
    }
};