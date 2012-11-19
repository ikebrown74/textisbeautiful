from django.conf.urls import patterns, include, url
from django.views.generic import TemplateView

# Uncomment the next two lines to enable the admin:
# from django.contrib import admin
# admin.autodiscover()

urlpatterns = patterns('',
    # Examples:
    # url(r'^$', 'tib.views.home', name='home'),
    # url(r'^tib/', include('tib.foo.urls')),

    # Uncomment the admin/doc line below to enable admin documentation:
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    # url(r'^admin/', include(admin.site.urls)),

    # Static views
    (r'^$', TemplateView.as_view(template_name="index.html")),
    (r'^about/$', TemplateView.as_view(template_name="about.html")),
    (r'^contact/$', TemplateView.as_view(template_name="contact.html")),
    (r'^create/$', TemplateView.as_view(template_name="create.html")),
    (r'^faq/$', TemplateView.as_view(template_name="faq.html")),

    # Dynamic views
    url(r'^result/$', 'tib.views.result'),
    url (r'^result/([\w=-]+)/?$', 'tib.views.status'),
)
