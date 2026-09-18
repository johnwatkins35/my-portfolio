FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html app.js data.js labs.js styles.css export-docx.js favicon.svg /usr/share/nginx/html/
EXPOSE 80
