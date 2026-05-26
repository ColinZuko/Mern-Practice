import { getPosts, getTrendingPosts } from '../api' // Import both hooks
import { useState, useEffect } from 'react'
import { BlogCard } from '../components/BlogCard'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"
import AutoScroll from 'embla-carousel-auto-scroll'

export function Home() {
  const [posts, setPosts] = useState([])
  const [trendingPosts, setTrendingPosts] = useState([]) // State for analytics data

  useEffect(() => {
    async function loadAllPageData() {
      try {
        // 1. Load and sort your original posts array
        const allData = await getPosts();
        if (allData) {
          allData.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated))
          setPosts(allData)
        }

        // 2. Fetch the top 6 most-viewed posts from your new route
        const trendingData = await getTrendingPosts();
        if (trendingData) {
          setTrendingPosts(trendingData)
        }
      } catch (error) {
        console.error("Error loading home page collections:", error);
      }
    }
    loadAllPageData()
  }, [])

  return (
    <div className="w-full max-w-[90vw] mx-auto mt-20 px-12 space-y-24 pb-20">
      
      {/* SECTION 1: LATEST POSTS */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
        <h2 className="scroll-m-20 text-3xl font-bold tracking-tight text-balance text-primary">
          Latest Recipe Posts
        </h2>
        <p className="text-sm text-primary/80">
            The most recent recipes added to our collection.
        </p>
        </div>
        
        <Carousel
          opts={{
            align: "start",
            loop: true,
            watchDrag: true,
            dragFree: true,
          }}
          plugins={[
            AutoScroll({
              speed: 1, 
              stopOnInteraction: false,
              stopOnMouseEnter: true,
            }),
          ]}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {posts.slice(0, 10).map((post) => (
              <CarouselItem 
                key={`latest-${post._id || post.id}`} 
                className="pl-4 basis-1/3 md:basis-1/2 lg:basis-1/3"
              >
                <div className="h-full p-1">
                  <BlogCard post={post} />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </section>


      {/* SECTION 2: MOST VIEWED/TRENDING */}
      {trendingPosts.length > 0 && (
        <section className="space-y-6 border-t border-stone-200/60 pt-16">
          <div className="text-center space-y-2">
            <h2 className="scroll-m-20 text-3xl font-bold tracking-tight text-balance text-primary">
              Trending This Week
            </h2>
            <p className="text-sm text-primary/80">
              The most viewed and cooked recipes by our community.
            </p>
          </div>

          <Carousel
            opts={{
              align: "start",
              loop: true,
              watchDrag: true,
              dragFree: true,
            }}
            plugins={[
              AutoScroll({
                speed: 1.5, // Slightly faster speed to visually differentiate it
                stopOnInteraction: false,
                stopOnMouseEnter: true,
              }),
            ]}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {trendingPosts.map((post) => (
                <CarouselItem 
                  key={`trending-${post._id || post.id}`} 
                  className="pl-4 basis-1/3 md:basis-1/2 lg:basis-1/3"
                >
                  <div className="h-full p-1">
                    <BlogCard post={post} />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </section>
      )}

      {/* SECTION 3: ALL POSTS GRID */}
      <section className="space-y-6 border-t border-stone-200/60 pt-16">
        <div className="text-center space-y-2">
          <h2 className="scroll-m-20 text-3xl font-bold tracking-tight text-balance text-primary">
            All Recipes
          </h2>
          <p className="text-sm text-primary/80">
            Browse our entire collection of delicious recipes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {posts.map((post) => (
            <div key={`grid-${post._id || post.id}`} className="h-full">
              <BlogCard post={post} />
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}