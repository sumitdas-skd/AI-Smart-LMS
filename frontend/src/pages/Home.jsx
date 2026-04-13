import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Search, MessageSquare, Database, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const Home = () => {
    return (
        <div className="bg-white overflow-hidden">
            {/* Hero Section */}
            <div className="relative isolate px-6 pt-14 lg:px-8">
                {/* Background decorative blobs */}
                <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
                    <motion.div 
                        animate={{ 
                            scale: [1, 1.1, 1],
                            rotate: [0, 5, 0]
                        }}
                        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                        className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
                    />
                </div>

                <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
                    <div className="text-center">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            className="mb-8 flex justify-center"
                        >
                            <div className="relative rounded-full px-3 py-1 text-sm leading-6 text-gray-600 ring-1 ring-gray-900/10 hover:ring-gray-900/20 transition-all bg-white/50 backdrop-blur-sm">
                                Announcing AI Tutor 2.0.{' '}
                                <Link to="/register" className="font-semibold text-brand-600">
                                    <span className="absolute inset-0" aria-hidden="true" />
                                    Read more <span aria-hidden="true">&rarr;</span>
                                </Link>
                            </div>
                        </motion.div>

                        <motion.h1 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-6xl"
                        >
                            ABIT College <br />
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-teal-400">AI Smart LMS</span>
                        </motion.h1>

                        <motion.p 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="mt-6 text-lg leading-8 text-gray-600"
                        >
                            The comprehensive Learning Management System for BPUT Computer Science students. Access notes, previous questions, video lectures, and get 24/7 help from our AI Tutor.
                        </motion.p>

                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="mt-10 flex items-center justify-center gap-x-6"
                        >
                            <Link to="/register">
                                <motion.div
                                    whileHover={{ scale: 1.05, boxShadow: "0 10px 25px -5px rgba(20, 184, 166, 0.4)" }}
                                    whileTap={{ scale: 0.95 }}
                                    className="rounded-xl bg-brand-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg transition-colors hover:bg-brand-500 flex items-center gap-2"
                                >
                                    Get Started <ArrowRight className="h-4 w-4" />
                                </motion.div>
                            </Link>
                            <Link to="/subjects">
                                <motion.div 
                                    whileHover={{ x: 5 }}
                                    className="text-sm font-bold leading-6 text-gray-900 flex items-center gap-1"
                                >
                                    Browse Subjects <span aria-hidden="true">→</span>
                                </motion.div>
                            </Link>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Feature Section */}
            <div className="py-24 sm:py-32 bg-gray-50/50 backdrop-blur-sm">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="mx-auto max-w-2xl lg:text-center"
                    >
                        <h2 className="text-base font-bold leading-7 text-brand-600 uppercase tracking-widest flex items-center justify-center gap-2">
                            <Sparkles className="h-4 w-4" /> Study Smarter
                        </h2>
                        <p className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                            Everything you need to ace your exams
                        </p>
                    </motion.div>
                    
                    <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
                        <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
                            {[
                                {
                                    title: "Centralized Resources",
                                    desc: "Notes, Video Lectures, and Previous Year Questions synced with the BPUT CS Syllabus.",
                                    icon: Database
                                },
                                {
                                    title: "AI Tutor Integration",
                                    desc: "Stuck on a topic? Ask the AI Tutor powered by Gemini Pro for context-aware answers.",
                                    icon: MessageSquare
                                }
                            ].map((feature, i) => (
                                <motion.div 
                                    key={i}
                                    initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="relative pl-16 group p-8 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all"
                                >
                                    <dt className="text-base font-bold leading-7 text-gray-900">
                                        <div className="absolute left-6 top-8 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                                            <feature.icon className="h-6 w-6 text-white" />
                                        </div>
                                        {feature.title}
                                    </dt>
                                    <dd className="mt-2 text-base leading-7 text-gray-600">{feature.desc}</dd>
                                </motion.div>
                            ))}
                        </dl>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
