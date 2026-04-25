./app/api/admin/images/bulk-unused-inactive/route.ts:4:1
Module not found: Can't resolve '@/app/lib/cloudinary'
2 | // daily challenge, or as car-of-the-day, from both Cloudinary and the database.
3 | import { prisma } from "@/app/lib/prisma";

> 4 | import { cloudinary } from "@/app/lib/cloudinary";

    | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

./app/api/admin/staging/bulk-unused-rejected/route.ts:4:1
Module not found: Can't resolve '@/app/lib/cloudinary'
2 | // that have never been served in a round, daily challenge, or as car-of-the-day.
3 | import { prisma } from "@/app/lib/prisma";

> 4 | import { cloudinary } from "@/app/lib/cloudinary";

    | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
