## Cau hinh INTERNAL_TOKEN

`INTERNAL_TOKEN` la shared secret giua backend va `ml-service` de chan viec goi truc tiep ML API bo qua backend.

1. Sinh token moi:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

2. Dat cung mot gia tri o hai file:

```text
backend/.env -> INTERNAL_TOKEN=<token>
ml-service/.env -> INTERNAL_TOKEN=<token>
```

3. Restart ca backend va `ml-service`.

Neu hai token khac nhau, cac call AI nhu `/analyze-report`, `/analyze-with-rubrics`, `/extract-pdf`, `/match-student` se bi tra ve `403`.
