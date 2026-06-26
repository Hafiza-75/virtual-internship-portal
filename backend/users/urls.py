from django.urls import path

from .views import (
    register,
    login,
    generate_quiz_api,
    submit_quiz,
    chat_with_ai,
    my_results,
    dashboard_stats,
    get_projects,
    save_solution,
    evaluate_project,
    generate_project_requirements_api,  
    reattempt_project,      
    project_attempts,
    get_admin_stats,
    get_all_users,
    get_all_reports,
    delete_user,
    get_user_profile,
    get_skills,
    update_skills,
    mentor_matched_projects,
    submit_mentor_feedback,
    mentor_progress_stats,
    student_mentor_feedbacks,
    mentor_get_project,
    mentor_matched_projects_v2,
    mentor_submit_review,
    generate_reports,
    delete_report,
    get_report_detail,
    admin_get_all_projects,
    admin_update_project,
    admin_delete_project,
    admin_mentor_stats,
    admin_all_mentor_feedbacks,
    admin_mentor_feedback_detail,
    admin_delete_mentor_feedback,
    admin_platform_stats,
    admin_add_user,
    get_portfolio_with_profile, 
    update_portfolio_profile, 
    generate_portfolio_pdf,
    save_task_solution,
    get_task_solutions,
    get_student_progress_trend,
    get_skill_improvement_insights,
    get_admin_analytics,
    get_student_comparison_analytics,
    evaluate_task_solution,
)

from .profile_views import get_profile, update_profile

urlpatterns = [
    # AUTH
    path('register/', register, name='register'),
    path('login/', login, name='login'),

    # PROFILE
    path('profile/<str:email>/', get_profile, name='get_profile'),
    path('profile/update/<str:email>/', update_profile, name='update_profile'),
    
    # QUIZ SYSTEM
    path('generate-quiz/', generate_quiz_api, name='generate_quiz'),
    path('submit-quiz/', submit_quiz, name='submit_quiz'),
    
    # PROJECT SYSTEM 
    path('projects/', get_projects, name='get_projects'),
    path('save-solution/', save_solution, name='save_solution'),
    path('evaluate-project/', evaluate_project, name='evaluate_project'),
    path('generate-requirements/', generate_project_requirements_api, name='generate_requirements'), 
    path('reattempt-project/', reattempt_project, name='reattempt_project'),
    path('project-attempts/', project_attempts, name='project_attempts'),
    
    # TASK-BASED PROJECT SYSTEM (KEEP ONLY THESE)
    path('project/save-task/', save_task_solution, name='save_task_solution'),
    path('project/get-tasks/', get_task_solutions, name='get_task_solutions'),
    
    # RESULTS & STATS
    path('my-results/', my_results, name='my_results'),
    path('dashboard-stats/', dashboard_stats, name='dashboard_stats'),
    
    # AI CHATBOT
    path('chat/', chat_with_ai, name='chat_with_ai'),

    # Admin Panel Endpoints
    path('admin/stats/', get_admin_stats, name='admin_stats'),
    path('admin/users/', get_all_users, name='admin_users'),
    path('admin/reports/', get_all_reports, name='admin_reports'),
    path('admin/users/delete/<str:user_id>/', delete_user, name='delete_user'),
     
    # Profile & Skills
    path('user/', get_user_profile, name='get_user_profile'),
    path('get-skills/', get_skills, name='get_skills'),
    path('update-skills/', update_skills, name='update_skills'),
    
    # Mentor Feedback System
    path('mentor/matched-projects/', mentor_matched_projects, name='mentor_matched_projects'),
    path('mentor/submit-feedback/', submit_mentor_feedback, name='submit_mentor_feedback'),
    path('mentor/progress/', mentor_progress_stats, name='mentor_progress_stats'),
    path('student/feedback/', student_mentor_feedbacks, name='student_mentor_feedbacks'),
    path('api/mentor/matched-projects-v2/', mentor_matched_projects_v2, name='mentor_matched_projects_v2'),
    path('mentor/project/', mentor_get_project, name='mentor_get_project'),
    path('mentor/submit-review/', mentor_submit_review, name='mentor_submit_review'),

    # Admin Report Management
    path('admin/generate-reports/', generate_reports, name='generate_reports'),
    path('admin/reports/delete/<str:report_id>/', delete_report, name='delete_report'),
    path('admin/reports/<str:report_id>/', get_report_detail, name='report_detail'),
    path('admin/projects/', admin_get_all_projects, name='admin_projects'),
    path('admin/projects/update/<str:project_id>/', admin_update_project, name='admin_update_project'),
    path('admin/projects/delete/<str:project_id>/', admin_delete_project, name='admin_delete_project'),

    # Admin Mentor Management
    path('admin/mentor-stats/', admin_mentor_stats, name='admin_mentor_stats'),
    path('admin/mentor-feedbacks/', admin_all_mentor_feedbacks, name='admin_all_mentor_feedbacks'),
    path('admin/mentor-feedback/<str:feedback_id>/', admin_mentor_feedback_detail, name='admin_mentor_feedback_detail'),
    path('admin/mentor-feedback/delete/<str:feedback_id>/', admin_delete_mentor_feedback, name='admin_delete_mentor_feedback'),
    path('admin/platform-stats/', admin_platform_stats, name='admin_platform_stats'),
    path('admin/users/add/', admin_add_user, name='admin_add_user'),

    # Portfolio Management
    path('portfolio/full/', get_portfolio_with_profile, name='get_portfolio_with_profile'),
    path('portfolio/update/', update_portfolio_profile, name='update_portfolio_profile'),
    path('portfolio/generate-pdf/', generate_portfolio_pdf, name='generate_portfolio_pdf'),

    # Reporting and Analytics
    path('analytics/student-progress/', get_student_progress_trend, name='student_progress_trend'),
    path('analytics/skill-insights/', get_skill_improvement_insights, name='skill_insights'),
    path('analytics/admin-stats/', get_admin_analytics, name='admin_analytics'),
    path('analytics/student-comparison/', get_student_comparison_analytics, name='student_comparison'),
    path('project/evaluate-task/', evaluate_task_solution, name='evaluate_task'),

]