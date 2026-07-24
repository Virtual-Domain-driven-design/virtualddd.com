---
title: "[DDDDD-20]  « it's traverse »"
slug: "ddddd-20-its-traverse"
status: "Done"
datetime: 2020-05-15T06:30:00.000+00:00
wordpressPublishedDate: 2020-05-15
typeOfSession: "talk"
level: ["Advanced"]
tags: ["DDDDD", "functional programming", "haskell"]
video: "https://www.youtube.com/embed/sIJr3SCKhjo"
organiser: "Kenny Baas-Schwegler"
coOrganisers: ["Krisztina Hirth"]
featuredImage: "./_assets/ddddd-20-its-traverse-featured.jpeg"
---

The `traverse` function is so pervasive in functional programming that it became a joke:
— How do I do— It's traverse
[https://twitter.com/search?q=%22it%27s%20traverse%22&src=typed_query](/e342ff0d7e8c4a3d9ae96de0fb20ea0d)

Since it's a bit abstract until you actually encounter it, let's dig a little and review some case where… well, it was _actually_ `traverse`.
- async calls - input validation - conditional execution - parsers generation - …

In addition to making an elated crowd shout 'it's traverse', it will be a good occasion to learn more about what's an applicative functor and how it can be used.

Examples will mostly be haskell, but we'll start with JS to ease into it more easily (someone once said that 67% of the NPM ecosystem could be replaced with `traverse`).


