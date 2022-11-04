<?php
/**
 * @package Bitnami_Production_Console_Banner
 * @version 1.2
 */
/*
Plugin Name: Bitnami Production Console Helper
Plugin URI: https://github.com/bitnami-labs/wp-cloud-mgmt-console-plugin
Description: Description: Links your WordPress installation to the WordPress Cloud Management Console and Support. This Console provides a great user experience for launching and managing all your production WordPress deployments.
Author: Bitnami
Version: 1.2
Author URI: https://bitnami.com/
*/

add_action('admin_bar_menu', 'bitnami_prod_add_bar', 25);
function bitnami_prod_add_bar($admin_bar){
    $admin_bar->add_menu( array(
        'id'    => 'bitnami-prod-console',
        'title' => 'WordPress Cloud Management Console',
        'href'  => 'https://bitnami.com/wordpress-management-console',
        'meta'  => array(
            'title' => __('WordPress Cloud Management Console'),            
        ),
    ));
    $admin_bar->add_menu( array(
        'id'    => 'early-access',
        'parent' => 'bitnami-prod-console',
        'title' => 'Request Early Access',
        'href'  => 'https://bitnami.com/wordpress-management-console',
        'meta'  => array(
            'title' => __('Request Early Access'),
            'target' => '_blank',
            'class' => 'bitnami_prod_class'
        ),
    ));
    $admin_bar->add_menu( array(
        'id'    => 'bitnami-support',
        'parent' => 'bitnami-prod-console',
        'title' => 'Support',
        'href'  => 'https://helpdesk.bitnami.com/',
        'meta'  => array(
            'title' => __('Support'),
            'target' => '_blank',
            'class' => 'bitnami_prod_class'
        ),
    ));
    $admin_bar->add_menu( array(
        'id'    => 'bitnami-docs',
        'parent' => 'bitnami-prod-console',
        'title' => 'Documentation',
        'href'  => 'https://docs.bitnami.com',
        'meta'  => array(
            'title' => __('Documentation'),
            'target' => '_blank',
            'class' => 'bitnami_prod_class'
        ),
    ));
}

?>
