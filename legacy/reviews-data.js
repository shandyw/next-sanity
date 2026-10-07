/* Sample content only — illustrative, not verified editorial data.
  The source order is the only available ordering because publication dates are not supplied.
  Review photos are remote stock-style placeholders and do not depict the reviewer.

   `favorite`: true includes a published review on My Faves; false excludes it.
   Product info: fill in `brand`, `sizeTried` (Size), `color`, and
   `vintedUrl` (the full listing URL). Leave unknown values empty.
   `publishedAt` is the posted date in YYYY-MM-DD format. Leave blank
   until the actual date is known; populated dates enable newest-first sorting.
   Optional video: `videoUrl` is a direct MP4/WebM file URL or root-relative path.
   Leave it empty to hide the section. `videoPoster` is optional; otherwise the
   video’s first frame is shown, matching the homepage. Supply English WebVTT captions in
   `videoCaptionsUrl` and plain-text `videoTranscript` before publishing video.
   Use same-origin captions (or a media host configured for cross-origin access).
   `url` is the page the image and title both link to.
   `images` — cards with more than one image render as a swipeable slider.
   `fit` — "worn" uses object-fit: cover; "product" uses contain so a
   standalone item stays fully visible.
   `placeholder: true` marks a clearly labelled neutral stand-in. */

const TRENDING_REVIEWS = [
  {
    id: "t1",
    favorite: true,
    videoUrl: "https://cdn.rtrcdn.com/assets/imgs/OrganicHP_Hero_Desktop_081826.mp4",
    videoPoster: "",
    videoCaptionsUrl: "",
    videoTranscript: "",
    publishedAt: "2023-01-01",
    category: "jeans",
    brand: "Target",
    sizeTried: "16",
    color: "Blue",
    vintedUrl: "",
    title: "Jeans that pass the sit test",
    blurb: "Comfy, flattering, and they actually stay up.",
    url: "/reviews/?review=t1",
    fit: "worn",
    images: [
      "https://images.unsplash.com/photo-1475178626620-a4d074967452?w=600&h=750&fit=crop&q=80&fm=jpg",
      "https://images.unsplash.com/photo-1584370848010-d7fe6bc767ec?w=600&h=750&fit=crop&q=80&fm=jpg"
    ]
  },
  {
    id: "t2",
    favorite: false,
    videoUrl: "https://cdn.rtrcdn.com/assets/imgs/OrganicHP_Hero_Desktop_081826.mp4",
    videoPoster: "",
    videoCaptionsUrl: "",
    videoTranscript: "",
    publishedAt: "2024-01-01",
    category: "dresses",
    brand: "SHEIN",
    sizeTried: "16",
    color: "Acidwash",
    vintedUrl: "https://www.vinted.com/items/10209516323-hollister-long-sleeve-henley-top",
    title: "The dress that catfished me",
    blurb: "Gorgeous online. Weird in real life.",
    url: "/reviews/?review=t2",
    fit: "worn",
    images: [
      "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&h=750&fit=crop&q=80&fm=jpg",
      "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&h=750&fit=crop&q=80&fm=jpg"
    ]
  },
  {
    id: "t3",
    favorite: true,
    videoUrl: "https://cdn.rtrcdn.com/assets/imgs/OrganicHP_Hero_Desktop_081826.mp4",
    videoPoster: "",
    videoCaptionsUrl: "",
    videoTranscript: "",
    publishedAt: "2025-01-01",
    category: "tops",
    brand: "Temu",
    sizeTried: "XL",
    color: "Blue",
    vintedUrl: "https://www.vinted.com/items/10209516323-hollister-long-sleeve-henley-top?homepage_session_id=2578e1b7-02e5-4a7d-a26c-3a9f3ee41204",
    title: "Cute. With a few conditions.",
    blurb: "Love the look, but the sleeves are a whole situation.",
    url: "/reviews/?review=t3",
    fit: "worn",
    images: [
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&h=750&fit=crop&q=80&fm=jpg",
      "https://images.unsplash.com/photo-1520975954732-35dd22299614?w=600&h=750&fit=crop&q=80&fm=jpg"
    ]
  }
];

const REVIEW_COLLECTION = TRENDING_REVIEWS;
window.REVIEW_COLLECTION = REVIEW_COLLECTION;

/* Hero collage. The second frame carries corner tape and a yellow tag. */
const HERO_SHOTS = [
  {
    src: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=760&h=900&fit=crop&q=80&fm=jpg",
    alt: "A model in denim and a white top, sitting on outdoor steps"
  },
  {
    src: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=760&h=900&fit=crop&q=80&fm=jpg",
    alt: "Placeholder fashion photograph, not the reviewer"
  }
];

/* About image — square, per the layout. Placeholder until a real
   founder portrait exists; marked and flagged in the markup. */
const ABOUT_IMAGE = {
  src: "https://images.unsplash.com/photo-1475178626620-a4d074967452?w=680&h=520&fit=crop&q=80&fm=jpg",
  alt: "Placeholder fashion photograph, not the reviewer",
  placeholder: true
};

