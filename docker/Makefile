.PHONY: stop_containers clean_docker delete_containers delete_images destroy_all

#################################################################################
# GLOBALS                                                                       #
#################################################################################

SHELL=/bin/bash

#################################################################################
# PROJECT RULES                                                                 #
#################################################################################

## Install docker
install_docker:
	curl -sSL https://get.docker.com/ | sh
	sudo usermod -a -G docker $(USER)
	@echo "docker installed"

## Remove docker
remove_docker:
	sudo apt-get purge -y docker-engine docker docker.io docker-ce
	sudo apt-get autoremove -y --purge docker-engine docker docker.io docker-ce
	sudo rm -f -rf /var/lib/docker
	sudo rm -f /etc/apparmor.d/docker
	sudo rm -f -rf /var/run/docker.sock
	sudo rm -f /usr/local/bin/docker-compose
	sudo rm -f -rf /etc/docker

## Stop all containers
stop_containers:
	docker stop $(docker ps -a -q)
	@echo "all containers stopped"

clean_docker:
	docker system prune -a
	@echo "docker cleaned"

## Delete all containers
delete_containers:
	docker rm $(docker ps -a -q)
	@echo "all containers deleted"

## Delete all containers
delete_images:
	docker rmi $(docker images -q)
	@echo "all images deleted"

#################################################################################
# Self Documenting Commands                                                     #
#################################################################################

.DEFAULT_GOAL := help

# Inspired by <http://marmelab.com/blog/2016/02/29/auto-documented-makefile.html>
# sed script explained:
# /^##/:
# 	* save line in hold space
# 	* purge line
# 	* Loop:
# 		* append newline + line to hold space
# 		* go to next line
# 		* if line starts with doc comment, strip comment character off and loop
# 	* remove target prerequisites
# 	* append hold space (+ newline) to line
# 	* replace newline plus comments by `---`
# 	* print line
# Separate expressions are necessary because labels cannot be delimited by
# semicolon; see <http://stackoverflow.com/a/11799865/1968>
.PHONY: help
help:
	@echo "$$(tput bold)Available rules:$$(tput sgr0)"
	@echo
	@sed -n -e "/^## / { \
		h; \
		s/.*//; \
		:doc" \
		-e "H; \
		n; \
		s/^## //; \
		t doc" \
		-e "s/:.*//; \
		G; \
		s/\\n## /---/; \
		s/\\n/ /g; \
		p; \
	}" ${MAKEFILE_LIST} \
	| LC_ALL='C' sort --ignore-case \
	| awk -F '---' \
		-v ncol=$$(tput cols) \
		-v indent=19 \
		-v col_on="$$(tput setaf 6)" \
		-v col_off="$$(tput sgr0)" \
	'{ \
		printf "%s%*s%s ", col_on, -indent, $$1, col_off; \
		n = split($$2, words, " "); \
		line_length = ncol - indent; \
		for (i = 1; i <= n; i++) { \
			line_length -= length(words[i]) + 1; \
			if (line_length <= 0) { \
				line_length = ncol - indent - length(words[i]) - 1; \
				printf "\n%*s ", -indent, " "; \
			} \
			printf "%s ", words[i]; \
		} \
		printf "\n"; \
	}' \
	| more $(shell test $(shell uname) = Darwin && echo '--no-init --raw-control-chars')
