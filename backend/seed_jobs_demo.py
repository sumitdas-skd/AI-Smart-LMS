"""
Seed script to populate 20 realistic sample jobs across tech companies,
ATS providers, and on-campus placement drives for college demo.
All listings are clearly designated as sample demo entries.
"""
from datetime import datetime, timezone, timedelta
from app.database import SessionLocal
import app.models.user
from app.models.jobs import Job, JobSource

SAMPLE_JOBS = [
    {
        "source": "greenhouse",
        "external_id": "demo:stripe:swe-intern",
        "title": "Software Engineering Intern (Summer 2026) [Sample]",
        "company": "Stripe",
        "location": "Bengaluru, India",
        "work_mode": "hybrid",
        "job_type": "internship",
        "experience_level": "Entry Level / Student",
        "salary_min": 1000000,
        "salary_max": 1400000,
        "salary_currency": "INR",
        "description_text": "Join Stripe's Core Infrastructure engineering team. You will build and scale distributed ledger and payment systems handling billions in volume.\n\nKey Responsibilities:\n- Design scalable backend services in Ruby, Go, or Python.\n- Collaborate with senior staff engineers across global hubs.\n- Participate in on-call and code reviews.\n\nQualifications:\n- Currently pursuing B.Tech/B.E in Computer Science or related degree.\n- Experience with data structures, algorithms, and system design fundamentals.",
        "skills": ["Python", "Go", "Distributed Systems", "SQL"],
        "apply_url": "https://stripe.com/jobs/sample-swe-intern",
        "posted_hours_ago": 2,
    },
    {
        "source": "lever",
        "external_id": "demo:linear:frontend-engineer",
        "title": "Frontend Engineer - Product Experience [Sample]",
        "company": "Linear",
        "location": "Remote - India",
        "work_mode": "remote",
        "job_type": "fulltime",
        "experience_level": "Entry / Mid Level",
        "salary_min": 2400000,
        "salary_max": 3200000,
        "salary_currency": "INR",
        "description_text": "Linear is looking for a thoughtful frontend engineer to craft fast, delightful developer workflows.\n\nWhat you will do:\n- Build real-time collaborative issue tracking interfaces.\n- Optimize canvas rendering and WebGL interactions.\n- Maintain high polish and sub-100ms response latencies.",
        "skills": ["React", "TypeScript", "TailwindCSS", "GraphQL"],
        "apply_url": "https://linear.app/careers/sample-frontend",
        "posted_hours_ago": 6,
    },
    {
        "source": "ashby",
        "external_id": "demo:vercel:dx-intern",
        "title": "Developer Experience Engineer Intern [Sample]",
        "company": "Vercel",
        "location": "Remote - Global",
        "work_mode": "remote",
        "job_type": "internship",
        "experience_level": "Intern",
        "salary_min": 800000,
        "salary_max": 1200000,
        "salary_currency": "INR",
        "description_text": "Help empower millions of web creators by enhancing Next.js framework documentation, templates, and SDKs.\n\nRequirements:\n- Passion for JavaScript, TypeScript, and modern web frameworks.\n- Open source contributions or side projects.",
        "skills": ["JavaScript", "React", "Next.js", "Node.js"],
        "apply_url": "https://vercel.com/careers/sample-dx-intern",
        "posted_hours_ago": 12,
    },
    {
        "source": "adzuna",
        "external_id": "demo:adzuna:msft-hyd",
        "title": "Software Engineer - Azure Cloud [Sample]",
        "company": "Microsoft",
        "location": "Hyderabad, India",
        "work_mode": "hybrid",
        "job_type": "fulltime",
        "experience_level": "Fresh Graduate",
        "salary_min": 1800000,
        "salary_max": 2400000,
        "salary_currency": "INR",
        "description_text": "Microsoft India Development Center is hiring engineers for the Azure Cloud Platform.\n\nRole details:\n- Develop cloud microservices with high fault tolerance.\n- Monitor production infrastructure using telemetry tools.\n- Implement secure authentication and identity protocols.",
        "skills": ["C#", ".NET", "Azure", "Docker", "Kubernetes"],
        "apply_url": "https://careers.microsoft.com/sample-azure-dev",
        "posted_hours_ago": 18,
    },
    {
        "source": "adzuna",
        "external_id": "demo:adzuna:google-blr",
        "title": "Software Developer Intern - Google Cloud [Sample]",
        "company": "Google",
        "location": "Bengaluru, Karnataka",
        "work_mode": "onsite",
        "job_type": "internship",
        "experience_level": "Student",
        "salary_min": 1200000,
        "salary_max": 1600000,
        "salary_currency": "INR",
        "description_text": "Join Google's student engineering program. Tackle large-scale challenges across AI, distributed file storage, and data analytics pipelines.",
        "skills": ["C++", "Java", "Python", "Algorithms", "GCP"],
        "apply_url": "https://careers.google.com/sample-internship",
        "posted_hours_ago": 4,
    },
    {
        "source": "manual",
        "external_id": "demo:tcs:campus-drive-2026",
        "title": "Campus Placement Drive 2026 - Digital Cadre [Sample]",
        "company": "Tata Consultancy Services (TCS)",
        "location": "Bhubaneswar / Cuttack, Odisha",
        "work_mode": "onsite",
        "job_type": "fulltime",
        "experience_level": "Fresher",
        "salary_min": 700000,
        "salary_max": 900000,
        "salary_currency": "INR",
        "description_text": "Exclusive campus drive for ABIT engineering graduates. TCS Digital offers accelerated career growth in cloud and enterprise application development.",
        "skills": ["Java", "Spring Boot", "SQL", "Git"],
        "apply_url": "https://nextstep.tcs.com/campus/sample",
        "posted_hours_ago": 8,
    },
    {
        "source": "manual",
        "external_id": "demo:infosys:specialist-programmer",
        "title": "Specialist Programmer (SP) Campus Intake [Sample]",
        "company": "Infosys Ltd",
        "location": "Bhubaneswar / Bengaluru",
        "work_mode": "hybrid",
        "job_type": "fulltime",
        "experience_level": "Fresher",
        "salary_min": 950000,
        "salary_max": 1100000,
        "salary_currency": "INR",
        "description_text": "High-impact developer role focusing on full-stack architecture, microservices, and AI integrations.\n\nEligibility: Min 7.0 CGPA with strong problem solving skills.",
        "skills": ["Python", "Java", "Data Structures", "Docker"],
        "apply_url": "https://career.infosys.com/sample-sp",
        "posted_hours_ago": 26,
    },
    {
        "source": "greenhouse",
        "external_id": "demo:razorpay:sde-payments",
        "title": "Backend SDE 1 - Payment Gateway [Sample]",
        "company": "Razorpay",
        "location": "Bengaluru, Karnataka",
        "work_mode": "onsite",
        "job_type": "fulltime",
        "experience_level": "Entry Level",
        "salary_min": 1600000,
        "salary_max": 2200000,
        "salary_currency": "INR",
        "description_text": "Build payment rails powering millions of Indian merchants. Work on high-throughput low-latency transaction processing engines.",
        "skills": ["Go", "PHP", "MySQL", "Kafka", "Redis"],
        "apply_url": "https://razorpay.com/jobs/sample-sde1",
        "posted_hours_ago": 30,
    },
    {
        "source": "lever",
        "external_id": "demo:swiggy:data-engineer",
        "title": "Data Engineering Intern - Realtime Logistics [Sample]",
        "company": "Swiggy",
        "location": "Bengaluru, Karnataka",
        "work_mode": "hybrid",
        "job_type": "internship",
        "experience_level": "Intern",
        "salary_min": 600000,
        "salary_max": 800000,
        "salary_currency": "INR",
        "description_text": "Work with petabyte-scale data pipelines analyzing dispatch times, route optimization, and restaurant demand signals.",
        "skills": ["Python", "SQL", "Spark", "AWS", "BigQuery"],
        "apply_url": "https://careers.swiggy.com/sample-data-intern",
        "posted_hours_ago": 48,
    },
    {
        "source": "ashby",
        "external_id": "demo:cred:security-intern",
        "title": "Information Security Intern [Sample]",
        "company": "CRED",
        "location": "Bengaluru, Karnataka",
        "work_mode": "onsite",
        "job_type": "internship",
        "experience_level": "Student",
        "salary_min": 750000,
        "salary_max": 1000000,
        "salary_currency": "INR",
        "description_text": "Assist CRED's security team in vulnerability management, penetration testing, and cloud security compliance.",
        "skills": ["Python", "Linux", "OWASP", "Network Security"],
        "apply_url": "https://careers.cred.club/sample-sec-intern",
        "posted_hours_ago": 52,
    },
    {
        "source": "adzuna",
        "external_id": "demo:zomato:frontend-dev",
        "title": "Associate Frontend Developer [Sample]",
        "company": "Zomato",
        "location": "Gurgaon, Haryana",
        "work_mode": "onsite",
        "job_type": "fulltime",
        "experience_level": "0-1 Year",
        "salary_min": 1400000,
        "salary_max": 1800000,
        "salary_currency": "INR",
        "description_text": "Build dynamic, responsive web interfaces for food delivery and restaurant partner portals.",
        "skills": ["React", "JavaScript", "HTML5", "CSS3", "Redux"],
        "apply_url": "https://zomato.com/careers/sample-frontend",
        "posted_hours_ago": 60,
    },
    {
        "source": "greenhouse",
        "external_id": "demo:uber:swe-mobility",
        "title": "Software Engineer Intern - Mobility [Sample]",
        "company": "Uber",
        "location": "Hyderabad, Telangana",
        "work_mode": "hybrid",
        "job_type": "internship",
        "experience_level": "Student",
        "salary_min": 1100000,
        "salary_max": 1500000,
        "salary_currency": "INR",
        "description_text": "Develop mapping and dispatch infrastructure for millions of rides daily across global cities.",
        "skills": ["Java", "Go", "Distributed Systems", "Kafka"],
        "apply_url": "https://uber.com/careers/sample-swe-intern",
        "posted_hours_ago": 70,
    },
    {
        "source": "adzuna",
        "external_id": "demo:cisco:network-software",
        "title": "Network Software Engineer Intern [Sample]",
        "company": "Cisco Systems",
        "location": "Bengaluru, Karnataka",
        "work_mode": "hybrid",
        "job_type": "internship",
        "experience_level": "Intern",
        "salary_min": 850000,
        "salary_max": 1100000,
        "salary_currency": "INR",
        "description_text": "Develop next-generation enterprise routing protocols and telemetry observability tools.",
        "skills": ["C", "C++", "Python", "Networking", "Linux"],
        "apply_url": "https://jobs.cisco.com/sample-network-intern",
        "posted_hours_ago": 80,
    },
    {
        "source": "manual",
        "external_id": "demo:wipro:turbo-hiring",
        "title": "Wipro Turbo Graduate Engineer Trainee [Sample]",
        "company": "Wipro Ltd",
        "location": "Kolkata / Bhubaneswar",
        "work_mode": "onsite",
        "job_type": "fulltime",
        "experience_level": "Fresher",
        "salary_min": 650000,
        "salary_max": 850000,
        "salary_currency": "INR",
        "description_text": "On-campus opportunity for final-year engineering students. Roles in cloud migrations and enterprise software.",
        "skills": ["Java", "SQL", "HTML5", "Git"],
        "apply_url": "https://careers.wipro.com/sample-turbo",
        "posted_hours_ago": 96,
    },
    {
        "source": "greenhouse",
        "external_id": "demo:atlassian:site-reliability",
        "title": "Associate SRE - Cloud Infrastructure [Sample]",
        "company": "Atlassian",
        "location": "Bengaluru, Karnataka",
        "work_mode": "remote",
        "job_type": "fulltime",
        "experience_level": "Entry Level",
        "salary_min": 1700000,
        "salary_max": 2300000,
        "salary_currency": "INR",
        "description_text": "Join the team keeping Jira, Confluence, and Bitbucket online with 99.99% uptime SLAs.",
        "skills": ["Python", "Terraform", "AWS", "Kubernetes", "Linux"],
        "apply_url": "https://atlassian.com/careers/sample-sre",
        "posted_hours_ago": 110,
    },
    {
        "source": "lever",
        "external_id": "demo:flipkart:sde-intern",
        "title": "Software Development Engineer Intern [Sample]",
        "company": "Flipkart",
        "location": "Bengaluru, Karnataka",
        "work_mode": "onsite",
        "job_type": "internship",
        "experience_level": "Student",
        "salary_min": 1000000,
        "salary_max": 1300000,
        "salary_currency": "INR",
        "description_text": "Build high-scale checkout, search, and catalogue systems for India's leading eCommerce destination.",
        "skills": ["Java", "Spring Boot", "MySQL", "Kafka", "Data Structures"],
        "apply_url": "https://flipkartcareers.com/sample-sde-intern",
        "posted_hours_ago": 120,
    },
    {
        "source": "adzuna",
        "external_id": "demo:oracle:cloud-infra",
        "title": "Associate Software Engineer - OCI [Sample]",
        "company": "Oracle",
        "location": "Hyderabad, Telangana",
        "work_mode": "hybrid",
        "job_type": "fulltime",
        "experience_level": "0-2 Years",
        "salary_min": 1500000,
        "salary_max": 2000000,
        "salary_currency": "INR",
        "description_text": "Work on Oracle Cloud Infrastructure storage, virtual networks, and compute virtualization.",
        "skills": ["Java", "C++", "Linux", "Docker", "SQL"],
        "apply_url": "https://oracle.com/careers/sample-oci",
        "posted_hours_ago": 135,
    },
    {
        "source": "greenhouse",
        "external_id": "demo:phonepe:backend-sde",
        "title": "Software Engineer - UPI Platform [Sample]",
        "company": "PhonePe",
        "location": "Bengaluru, Karnataka",
        "work_mode": "onsite",
        "job_type": "fulltime",
        "experience_level": "Entry Level",
        "salary_min": 1800000,
        "salary_max": 2500000,
        "salary_currency": "INR",
        "description_text": "Build ultra-reliable UPI transaction switching architecture handling tens of millions of payments every day.",
        "skills": ["Java", "HBase", "Kafka", "Aerospike", "Redis"],
        "apply_url": "https://phonepe.com/careers/sample-upi-dev",
        "posted_hours_ago": 150,
    },
    {
        "source": "ashby",
        "external_id": "demo:figma:systems-intern",
        "title": "Systems Software Engineer Intern [Sample]",
        "company": "Figma",
        "location": "Remote - APAC",
        "work_mode": "remote",
        "job_type": "internship",
        "experience_level": "Intern",
        "salary_min": 1200000,
        "salary_max": 1600000,
        "salary_currency": "INR",
        "description_text": "Work with Figma's core engine team building WebAssembly and collaborative multi-player multiplayer sync algorithms.",
        "skills": ["C++", "Rust", "WebAssembly", "TypeScript"],
        "apply_url": "https://figma.com/careers/sample-systems-intern",
        "posted_hours_ago": 168,
    },
    {
        "source": "manual",
        "external_id": "demo:abit:training-internship",
        "title": "ABIT Placement Cell - AI Research Internship [Sample]",
        "company": "ABIT Centre of Excellence",
        "location": "Cuttack, Odisha",
        "work_mode": "onsite",
        "job_type": "internship",
        "experience_level": "Student",
        "salary_min": 180000,
        "salary_max": 300000,
        "salary_currency": "INR",
        "description_text": "Research and development internship in Generative AI and automated tutoring systems right here on campus.",
        "skills": ["Python", "PyTorch", "FastAPI", "React"],
        "apply_url": "https://abit.edu.in/placements/sample-internship",
        "posted_hours_ago": 190,
    },
]


def seed_demo_jobs():
    db = SessionLocal()
    now = datetime.now(timezone.utc)
    seeded_count = 0
    updated_count = 0

    try:
        # 1. Ensure sample company sources exist
        sample_sources = [
            ("greenhouse", "stripe", "Stripe"),
            ("greenhouse", "razorpay", "Razorpay"),
            ("lever", "linear", "Linear"),
            ("lever", "swiggy", "Swiggy"),
            ("ashby", "vercel", "Vercel"),
            ("ashby", "cred", "CRED"),
        ]
        for stype, slug, cname in sample_sources:
            existing_src = db.query(JobSource).filter(JobSource.type == stype, JobSource.slug == slug).first()
            if not existing_src:
                db.add(JobSource(type=stype, slug=slug, company_name=cname, enabled=True, last_status="Configured"))

        # 2. Seed the 20 jobs
        for item in SAMPLE_JOBS:
            posted_at = now - timedelta(hours=item["posted_hours_ago"])
            first_seen_at = posted_at
            last_seen_at = now

            existing = db.query(Job).filter(
                Job.source == item["source"],
                Job.external_id == item["external_id"]
            ).first()

            if existing:
                existing.title = item["title"]
                existing.company = item["company"]
                existing.location = item["location"]
                existing.work_mode = item["work_mode"]
                existing.job_type = item["job_type"]
                existing.experience_level = item["experience_level"]
                existing.salary_min = item["salary_min"]
                existing.salary_max = item["salary_max"]
                existing.salary_currency = item["salary_currency"]
                existing.description_text = item["description_text"]
                existing.skills = item["skills"]
                existing.apply_url = item["apply_url"]
                existing.is_active = True
                existing.last_seen_at = last_seen_at
                updated_count += 1
            else:
                new_job = Job(
                    source=item["source"],
                    external_id=item["external_id"],
                    title=item["title"],
                    company=item["company"],
                    location=item["location"],
                    work_mode=item["work_mode"],
                    job_type=item["job_type"],
                    experience_level=item["experience_level"],
                    salary_min=item["salary_min"],
                    salary_max=item["salary_max"],
                    salary_currency=item["salary_currency"],
                    description_text=item["description_text"],
                    skills=item["skills"],
                    apply_url=item["apply_url"],
                    posted_at=posted_at,
                    first_seen_at=first_seen_at,
                    last_seen_at=last_seen_at,
                    is_active=True,
                )
                db.add(new_job)
                seeded_count += 1

        db.commit()
        print(f"Successfully seeded {seeded_count} demo jobs, updated {updated_count}.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_jobs()
