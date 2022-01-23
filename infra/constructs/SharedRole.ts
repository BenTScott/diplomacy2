import {Construct} from "constructs";
import {Role, RoleProps} from "aws-cdk-lib/aws-iam";

export class SharedRole extends Role {
    static RoleDictionary : { [id: string]: Role } = {};

    private constructor(scope: Construct, id: string, props: RoleProps) {
        super(scope, id, props)
    }

    static getRole(scope: Construct, id: string, props: RoleProps) : Role {
        if (this.RoleDictionary[id]) {
            return this.RoleDictionary[id];
        }

        const role = new SharedRole(scope, id, props);
        this.RoleDictionary[id] = role;
        return role;
    }
}